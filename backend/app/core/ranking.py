"""Multi-signal ranking, confidence calibration, and result presentation."""

from __future__ import annotations

from dataclasses import dataclass

from app.core.config import Settings

# Retrieval strength (absolute, pre batch norm)
_EXACT_LEXICAL = 0.92
_STRONG_RETRIEVAL = 0.85
_REPEATED_LEXICAL_MIN = 0.86
_REPEATED_STRENGTH_DELTA = 0.06
_DOMINANCE_STRENGTH_GAP = 0.08
_DOMINANCE_FUSION_RATIO = 1.28
_CLUSTER_FUSION_RATIO = 0.72
_CLUSTER_STRENGTH_DELTA = 0.14
_MIN_PRESENT_STRENGTH = 0.42


@dataclass
class ScoredCandidate:
    surah: int
    ayah: int
    ayah_id: int
    phonetic_score: float = 0.0
    semantic_score: float = 0.0
    lexical_score: float = 0.0
    popularity: float = 0.0

    @property
    def fused_score(self) -> float:
        return (
            self.phonetic_score
            + self.semantic_score
            + self.lexical_score
            + 0.05 * self.popularity
        )


def retrieval_strength(candidate: ScoredCandidate) -> float:
    """Best absolute signal before batch min-max normalization."""
    return max(
        candidate.phonetic_score,
        candidate.semantic_score,
        candidate.lexical_score,
    )


def _confidence_high(strength: float) -> float:
    """Map strong retrieval to 90–99% display confidence."""
    s = min(1.0, max(0.0, strength))
    if s >= 0.96:
        return 0.98
    if s >= 0.90:
        return round(0.90 + 0.08 * (s - 0.90) / 0.06, 4)
    if s >= 0.82:
        return round(0.88 + 0.02 * (s - 0.82) / 0.08, 4)
    return round(0.82 + 0.06 * s / 0.82, 4)


def _confidence_cluster(
    strengths: list[float], fusion_scores: list[float]
) -> list[float]:
    """Relative confidences for genuinely close matches."""
    if not strengths:
        return []
    top_s, top_f = strengths[0], fusion_scores[0]
    confidences: list[float] = []
    for i, (s, f) in enumerate(zip(strengths, fusion_scores)):
        rel = (f / top_f) if top_f > 1e-9 else 1.0
        base = 0.52 + 0.36 * min(1.0, s)
        conf = base * (0.78 + 0.22 * rel) * (0.93**i)
        if i == 0 and s >= _STRONG_RETRIEVAL:
            conf = max(conf, _confidence_high(s) - 0.06)
        confidences.append(round(min(0.94, max(0.38, conf)), 4))
    return confidences


def _repeated_phrase_group(
    scored: list[tuple[ScoredCandidate, float]],
) -> list[tuple[ScoredCandidate, float]] | None:
    """
    Multiple ayahs share the same (or near-exact) phrase — keep all strong ties.
    """
    if len(scored) < 2:
        return None

    top_c, _ = scored[0]
    top_lex = top_c.lexical_score
    top_str = retrieval_strength(top_c)
    if top_lex < _REPEATED_LEXICAL_MIN and top_str < _EXACT_LEXICAL:
        return None

    group: list[tuple[ScoredCandidate, float]] = [scored[0]]
    for cand, raw in scored[1:]:
        s = retrieval_strength(cand)
        lex = cand.lexical_score
        if lex >= _REPEATED_LEXICAL_MIN and top_str - s <= _REPEATED_STRENGTH_DELTA:
            group.append((cand, raw))
            continue
        if top_str >= _EXACT_LEXICAL and s >= 0.88 and top_str - s <= 0.04:
            group.append((cand, raw))
            continue
        break

    return group if len(group) >= 2 else None


def _is_dominant_top(
    scored: list[tuple[ScoredCandidate, float]],
) -> bool:
    if len(scored) == 1:
        return True
    top_c, top_raw = scored[0]
    second_c, second_raw = scored[1]
    top_str = retrieval_strength(top_c)
    second_str = retrieval_strength(second_c)

    if top_str >= _EXACT_LEXICAL and top_str - second_str >= _DOMINANCE_STRENGTH_GAP:
        return True
    if top_c.lexical_score >= _EXACT_LEXICAL and second_c.lexical_score < 0.80:
        return True
    if top_str >= _STRONG_RETRIEVAL and top_str - second_str >= 0.12:
        return True
    if (
        top_c.phonetic_score >= 0.85
        and top_c.phonetic_score >= top_c.lexical_score
        and top_c.phonetic_score >= top_c.semantic_score
        and top_c.phonetic_score - second_c.phonetic_score >= 0.04
    ):
        return True
    if second_raw < 1e-9:
        return top_raw > 0.05
    return top_raw >= _DOMINANCE_FUSION_RATIO * second_raw + 0.04


def _cluster_slice(
    scored: list[tuple[ScoredCandidate, float]], top_k: int
) -> list[tuple[ScoredCandidate, float]]:
    if not scored:
        return []
    top_c, top_raw = scored[0]
    top_str = retrieval_strength(top_c)
    kept: list[tuple[ScoredCandidate, float]] = []

    for cand, raw in scored:
        s = retrieval_strength(cand)
        if s < _MIN_PRESENT_STRENGTH and raw < top_raw * _CLUSTER_FUSION_RATIO:
            continue
        if raw < top_raw * _CLUSTER_FUSION_RATIO and top_str - s > _CLUSTER_STRENGTH_DELTA:
            continue
        if raw < top_raw - 0.14 and top_str - s > 0.10:
            continue
        kept.append((cand, raw))
        if len(kept) >= top_k:
            break
    return kept


def calibrate_and_filter(
    scored: list[tuple[ScoredCandidate, float]],
    top_k: int,
) -> list[tuple[ScoredCandidate, float]]:
    """
    Post-fusion presentation: collapse clear winners, keep close/repeated ties.
    Does not re-score retrieval — only filters and calibrates confidence.
    """
    if not scored:
        return []

    repeated = _repeated_phrase_group(scored)
    if repeated:
        picked = repeated[:top_k]
        strengths = [retrieval_strength(c) for c, _ in picked]
        fusion_scores = [raw for _, raw in picked]
        confs = _confidence_cluster(strengths, fusion_scores)
        for i, s in enumerate(strengths):
            if s >= _EXACT_LEXICAL:
                confs[i] = max(confs[i], _confidence_high(s) - (0.03 * i))
        return [(picked[i][0], confs[i]) for i in range(len(picked))]

    if _is_dominant_top(scored):
        top_c, _ = scored[0]
        return [(top_c, _confidence_high(retrieval_strength(top_c)))]

    picked = _cluster_slice(scored, top_k)
    if not picked:
        return []
    strengths = [retrieval_strength(c) for c, _ in picked]
    fusion_scores = [raw for _, raw in picked]
    confs = _confidence_cluster(strengths, fusion_scores)
    return [(picked[i][0], confs[i]) for i in range(len(picked))]


def fuse_arabic_lexical(
    candidates: dict[int, ScoredCandidate],
    top_k: int,
) -> list[tuple[ScoredCandidate, float]]:
    """
    Arabic-only search: lexical scores are already absolute — skip batch min-max
    so partial/fuzzy ayah matches are not drowned out by shared prefixes.
    """
    if not candidates:
        return []
    scored = [(c, c.lexical_score) for c in candidates.values()]
    scored.sort(key=lambda x: (x[1], x[0].lexical_score), reverse=True)
    return calibrate_and_filter(scored, top_k)


def fuse_english_lexical(
    candidates: dict[int, ScoredCandidate],
    top_k: int,
) -> list[tuple[ScoredCandidate, float]]:
    """
    English prose search: lexical scores are absolute; optional semantic is additive.
    Avoids phonetic batch min-max drowning distinctive translation matches.
    """
    if not candidates:
        return []
    scored: list[tuple[ScoredCandidate, float]] = []
    for c in candidates.values():
        if c.lexical_score <= 0 and c.semantic_score <= 0:
            continue
        # Semantic carries 0.50 weight: for descriptive English queries (visual scenes,
        # paraphrases) the translation lexical match alone is unreliable because the
        # user's wording rarely matches the translation verbatim.  Semantic bridges
        # the gap ("moving like clouds" → "pass as the passing of clouds").
        raw = c.lexical_score + 0.50 * c.semantic_score + 0.05 * c.popularity
        scored.append((c, raw))
    scored.sort(key=lambda x: (x[1], x[0].lexical_score), reverse=True)
    return calibrate_and_filter(scored, top_k)


def fuse_and_rank(
    candidates: dict[int, ScoredCandidate],
    settings: Settings,
    top_k: int,
    *,
    weight_override: tuple[float, float, float] | None = None,
) -> list[tuple[ScoredCandidate, float]]:
    """
    Weighted fusion with min-max normalization per signal batch, then
    calibrated filtering for display confidence and result count.

    weight_override=(phonetic, semantic, lexical) bypasses settings weights
    when classify_query provides per-query routing weights.
    """
    if not candidates:
        return []

    if weight_override is not None:
        wp, ws, wl = weight_override
    else:
        wp = settings.weight_phonetic
        ws = settings.weight_semantic
        wl = settings.weight_lexical

    items = list(candidates.values())

    def _norm(values: list[float]) -> list[float]:
        if not values:
            return values
        lo, hi = min(values), max(values)
        if hi - lo < 1e-9:
            return [1.0 if v > 0 else 0.0 for v in values]
        return [(v - lo) / (hi - lo) for v in values]

    p_norm = _norm([c.phonetic_score for c in items])
    s_norm = _norm([c.semantic_score for c in items])
    l_norm = _norm([c.lexical_score for c in items])

    scored: list[tuple[ScoredCandidate, float]] = []
    for c, pn, sn, ln in zip(items, p_norm, s_norm, l_norm):
        raw = wp * pn + ws * sn + wl * ln + 0.05 * c.popularity
        scored.append((c, raw))

    scored.sort(key=lambda x: x[1], reverse=True)
    return calibrate_and_filter(scored, top_k)
