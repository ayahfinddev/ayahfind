"""
Conservative additive Arabic retrieval signals.

Contract:
- ``baseline_*`` functions mirror legacy production scoring (frozen baseline).
- ``combine_arabic_scores`` only raises scores, never lowers them.
- Production uses max(baseline, augmented) so working queries stay working.
"""

from __future__ import annotations

import math
import re
from collections import Counter

from rapidfuzz import fuzz

from app.core.arabic_text import arabic_token_variants

_AR_WORD = re.compile(r"[\u0600-\u06FF]+")


def baseline_arabic_score(query_norm: str, target_norm: str) -> tuple[float, str]:
    """Legacy QuranSearchEngine Arabic scorer (single normalized field)."""
    if not query_norm:
        return 0.0, "empty"
    if not target_norm:
        return 0.0, "empty"
    if query_norm in target_norm:
        return 0.98, "arabic_phrase_contains"
    ratio = fuzz.partial_ratio(query_norm, target_norm) / 100.0
    if ratio > 0.92:
        return ratio * 0.97, "arabic_fuzzy"
    return ratio * 0.7, "arabic_weak"


def baseline_lexical_arabic_score(query_norm: str, target_norm: str) -> float:
    """Legacy LexicalSearchEngine in-memory Arabic scorer."""
    if not query_norm or not target_norm:
        return 0.0
    if query_norm in target_norm:
        return 0.98
    if len(query_norm) >= 4:
        ratio = fuzz.partial_ratio(query_norm, target_norm) / 100.0
        if ratio >= 0.90:
            return ratio * 0.92
    return 0.0


def arabic_tokens(text: str) -> list[str]:
    return [t for t in _AR_WORD.findall(text) if len(t) >= 2]


def char_ngrams(text: str, n: int = 3) -> set[str]:
    t = text.replace(" ", "")
    if len(t) < n:
        return {t} if t else set()
    return {t[i : i + n] for i in range(len(t) - n + 1)}


def token_jaccard(query_norm: str, target_norm: str) -> float:
    q_tok = set(arabic_tokens(query_norm))
    t_tok = set(arabic_tokens(target_norm))
    if not q_tok or not t_tok:
        return 0.0
    inter = len(q_tok & t_tok)
    union = len(q_tok | t_tok)
    return inter / union if union else 0.0


def _token_keys(tokens: list[str]) -> set[str]:
    keys: set[str] = set()
    for t in tokens:
        keys.update(arabic_token_variants(t))
    return keys


def token_overlap_ratio(query_norm: str, target_norm: str) -> float:
    q_tok = arabic_tokens(query_norm)
    if not q_tok:
        return 0.0
    t_keys = _token_keys(arabic_tokens(target_norm))
    if not t_keys:
        return 0.0
    matched = sum(1 for w in q_tok if arabic_token_variants(w) & t_keys)
    return matched / len(q_tok)


def fuzzy_token_overlap_ratio(query_norm: str, target_norm: str, min_ratio: int = 86) -> float:
    """Token overlap with per-token fuzzy match (STT / spelling tolerance)."""
    q_tok = arabic_tokens(query_norm)
    if not q_tok:
        return 0.0
    t_tok = arabic_tokens(target_norm)
    if not t_tok:
        return 0.0
    matched = 0
    for qw in q_tok:
        q_keys = arabic_token_variants(qw)
        if any(k in _token_keys(t_tok) for k in q_keys):
            matched += 1
            continue
        if any(
            fuzz.ratio(qw, tw) >= min_ratio or fuzz.ratio(qw, tv) >= min_ratio
            for tw in t_tok
            for tv in arabic_token_variants(tw)
        ):
            matched += 1
    return matched / len(q_tok)


def ngram_overlap(query_norm: str, target_norm: str, n: int = 3) -> float:
    q_ng = char_ngrams(query_norm, n)
    t_ng = char_ngrams(target_norm, n)
    if not q_ng or not t_ng:
        return 0.0
    return len(q_ng & t_ng) / len(q_ng)


def simple_bm25_token_score(query_norm: str, target_norm: str, k1: float = 1.2, b: float = 0.75) -> float:
    q_tok = arabic_tokens(query_norm)
    t_tok = arabic_tokens(target_norm)
    if not q_tok or not t_tok:
        return 0.0
    tf = Counter(t_tok)
    dl = len(t_tok)
    avg_dl = 12.0
    score = 0.0
    for term in set(q_tok):
        f = tf.get(term, 0)
        if f == 0:
            continue
        idf = 1.0 + math.log(1.0 + 1.0 / (1.0 + f))
        denom = f + k1 * (1.0 - b + b * dl / avg_dl)
        score += idf * (f * (k1 + 1.0)) / denom
    if score <= 0:
        return 0.0
    return min(1.0, score / (len(set(q_tok)) * 3.5))


def fuzzy_partial_score(query_norm: str, target_norm: str) -> float:
    if not query_norm or not target_norm:
        return 0.0
    return fuzz.partial_ratio(query_norm, target_norm) / 100.0


def combine_arabic_scores(
    base_score: float,
    base_reason: str,
    query_norm: str,
    target_norm: str,
) -> tuple[float, str, dict[str, float]]:
    breakdown: dict[str, float] = {"base": round(base_score, 4)}
    if base_score >= 0.97:
        return base_score, base_reason, breakdown

    partial = fuzzy_partial_score(query_norm, target_norm)
    token_set = fuzz.token_set_ratio(query_norm, target_norm) / 100.0
    wratio = fuzz.WRatio(query_norm, target_norm) / 100.0
    tok_ov = token_overlap_ratio(query_norm, target_norm)
    tok_fuzzy = fuzzy_token_overlap_ratio(query_norm, target_norm)
    ngram = ngram_overlap(query_norm, target_norm)
    jacc = token_jaccard(query_norm, target_norm)
    bm25 = simple_bm25_token_score(query_norm, target_norm)
    breakdown.update(
        {
            "partial": round(partial, 4),
            "token_set": round(token_set, 4),
            "wratio": round(wratio, 4),
            "token_overlap": round(tok_ov, 4),
            "token_fuzzy": round(tok_fuzzy, 4),
            "ngram": round(ngram, 4),
            "jaccard": round(jacc, 4),
            "bm25": round(bm25, 4),
        }
    )

    boosted = base_score
    reasons: list[str] = [base_reason]
    if partial > base_score:
        boosted = max(boosted, partial * 0.97)
        if partial >= 0.88 and "fuzzy" not in base_reason:
            reasons.append("partial_boost")
    if token_set >= 0.88:
        boosted = max(boosted, min(0.97, token_set * 0.96))
        reasons.append("token_set")
    if wratio >= 0.85 and wratio > boosted:
        boosted = max(boosted, wratio * 0.94)
        reasons.append("wratio")
    if tok_fuzzy >= 0.65 and tok_fuzzy > tok_ov:
        boosted = max(boosted, min(0.94, 0.55 + tok_fuzzy * 0.38))
        reasons.append("token_fuzzy")
    if tok_ov >= 0.55:
        boost = min(0.12, tok_ov * 0.14)
        if boost > 0.02:
            boosted = max(boosted, base_score + boost)
            reasons.append("token_overlap")
    if ngram >= 0.45:
        boost = min(0.10, ngram * 0.12)
        if boost > 0.02:
            boosted = max(boosted, base_score + boost)
            reasons.append("ngram")
    if bm25 >= 0.35 and bm25 > base_score * 0.5:
        boosted = max(boosted, min(0.94, bm25 * 0.88))
        reasons.append("bm25")
    if jacc >= 0.4 and boosted < 0.75:
        boosted = max(boosted, min(0.90, jacc * 0.85 + partial * 0.1))

    # Monotonic: never score below legacy baseline for this candidate.
    final = max(base_score, min(0.98, boosted))
    reason = "|".join(dict.fromkeys(reasons))
    breakdown["final"] = round(final, 4)
    return final, reason, breakdown


def merge_baseline_and_augmented(
    baseline_score: float,
    baseline_reason: str,
    augmented_score: float,
    augmented_reason: str,
    augmented_breakdown: dict[str, float] | None = None,
) -> tuple[float, str, dict[str, float]]:
    """Production merge: augmented recall layered on frozen baseline."""
    breakdown = dict(augmented_breakdown or {})
    breakdown["baseline"] = round(baseline_score, 4)
    if augmented_score > baseline_score:
        final = augmented_score
        reason = augmented_reason
    else:
        final = baseline_score
        reason = baseline_reason
    breakdown["final"] = round(final, 4)
    return final, reason, breakdown
