"""
Mode-separated Qur'an search with transliteration phrase matching and confidence gating.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field

from rapidfuzz import fuzz

from app.core.arabic_text import arabic_for_search, normalize_arabic, prepare_transliteration_fields
from app.core.retrieval_scoring import (
    baseline_arabic_score,
    combine_arabic_scores,
    merge_baseline_and_augmented,
)
from app.core.transliteration import (
    content_tokens,
    detect_search_type,
    normalize_transliteration,
    phrase_similarity,
)

logger = logging.getLogger("ayahfind.search")

CONFIDENCE_HIGH = 0.85
CONFIDENCE_MEDIUM = 0.55
CONFIDENCE_WEAK_MIN = 0.40

NO_MATCH_MESSAGE = "No confident match found. Try a meaning like patience or gratitude, or describe the idea in a few words."
NO_MATCH_MESSAGE_CONCEPT = "No strong thematic match yet. Try a related word like sabr, grateful, or mercy."

_TOKEN_STEM_HINTS: tuple[tuple[str, str], ...] = (
    ("zina", "zny"),
    ("taqrab", "tqrb"),
    ("rabbana", "rbna"),
    ("hasanah", "hsnh"),
    ("yukallif", "yklf"),
    ("wusaha", "wsah"),
    ("insan", "nsn"),
    ("suda", "sd"),
    ("iyyaka", "ayak"),
    ("nastain", "nstyn"),
    ("huwallahu", "allh"),
    ("ahad", "ahd"),
    ("huwa", "hw"),
    ("qul", "ql"),
)


def _transliteration_token_boost(query_norm: str, target: str) -> float:
    if not query_norm or not target:
        return 0.0
    hits = 0
    boost = 0.0
    for needle, stem in _TOKEN_STEM_HINTS:
        if needle in query_norm and stem in target:
            hits += 1
            boost += 0.16
    if hits >= 3:
        boost += 0.1
    return min(0.38, boost)


def _transliteration_match_count(query_norm: str, target: str) -> int:
    if not query_norm or not target:
        return 0
    return sum(
        1 for needle, stem in _TOKEN_STEM_HINTS if needle in query_norm and stem in target
    )


@dataclass
class AyahDocument:
    id: int
    surah: int
    ayah: int
    surah_name_en: str
    text_ar: str
    text_ar_normalized: str
    text_ar_search_normalized: str
    transliteration: str
    transliteration_normalized: str
    translation_en: str


@dataclass
class SearchHit:
    surah: int
    ayah: int
    confidence: float
    text_ar: str
    transliteration: str
    translation_en: str
    match_mode: str
    match_reason: str
    raw_score: float = 0.0

    def to_dict(self) -> dict:
        return {
            "surah": self.surah,
            "ayah": self.ayah,
            "confidence": self.confidence,
            "text_ar": self.text_ar,
            "transliteration": self.transliteration,
            "translation_en": self.translation_en,
            "match_mode": self.match_mode,
            "match_reason": self.match_reason,
        }


@dataclass
class SearchDebug:
    raw_query: str
    search_type: str
    normalized_query: str
    top_candidates: list[dict] = field(default_factory=list)


@dataclass
class SearchResult:
    primary: list[SearchHit]
    weak_matches: list[SearchHit]
    debug: SearchDebug | None
    message: str | None = None
    query: str = ""
    intent_hint: str | None = None

    def to_api_dict(self) -> dict:
        out: dict = {
            "query": self.query,
            "results": [h.to_dict() for h in self.primary],
        }
        if self.message:
            out["message"] = self.message
        if self.intent_hint:
            out["intent_hint"] = self.intent_hint
        if self.weak_matches:
            out["weak_matches"] = [h.to_dict() for h in self.weak_matches]
        if self.debug:
            out["debug"] = {
                "search_type": self.debug.search_type,
                "normalized_query": self.debug.normalized_query,
                "top_candidates": self.debug.top_candidates,
            }
        return out


class QuranSearchEngine:
    def __init__(self, ayahs: list[dict], *, retrieval_augmentation: bool = True) -> None:
        self._retrieval_augmentation = retrieval_augmentation
        self._docs: list[AyahDocument] = []
        for i, row in enumerate(ayahs, start=1):
            text_ar = row.get("text_ar") or ""
            surah = int(row.get("surah", row.get("surah_number", 0)))
            ayah = int(row.get("ayah", row.get("ayah_number", 0)))
            ar_norm = row.get("text_ar_normalized") or normalize_arabic(text_ar)
            ar_search = row.get("text_ar_search_normalized") or arabic_for_search(text_ar, surah, ayah)
            trans = row.get("transliteration") or ""
            trans_norm = row.get("transliteration_normalized") or ""
            if trans and not trans_norm:
                _, trans_norm = prepare_transliteration_fields(text_ar, trans)
            elif not trans:
                trans, trans_norm = prepare_transliteration_fields(text_ar)
            self._docs.append(
                AyahDocument(
                    id=row.get("id", i),
                    surah=surah,
                    ayah=ayah,
                    surah_name_en=row.get("surah_name_en", row.get("name_en", "")),
                    text_ar=text_ar,
                    text_ar_normalized=ar_norm,
                    text_ar_search_normalized=ar_search,
                    transliteration=trans,
                    transliteration_normalized=trans_norm,
                    translation_en=row.get("translation_en") or row.get("translation", "") or "",
                )
            )

    @property
    def ayah_count(self) -> int:
        return len(self._docs)

    def search(
        self,
        query: str,
        top_k: int = 10,
        mode_filter: str | None = None,
        debug: bool = False,
    ) -> SearchResult:
        primary, weak, dbg, intent_hint, concept_query = self._search_internal(
            query, top_k, mode_filter, debug
        )
        message = None
        if not primary:
            message = NO_MATCH_MESSAGE_CONCEPT if concept_query else NO_MATCH_MESSAGE
        return SearchResult(
            primary=primary,
            weak_matches=weak,
            debug=dbg,
            message=message,
            query=query.strip(),
            intent_hint=intent_hint,
        )

    def _search_internal(
        self,
        query: str,
        top_k: int,
        mode_filter: str | None,
        debug: bool,
    ) -> tuple[list[SearchHit], list[SearchHit], SearchDebug | None, str | None, bool]:
        q = query.strip()
        if not q:
            return [], [], SearchDebug(q, "empty", ""), None, False

        from app.core.thematic_lexicon import match_themes, theme_label_for_query
        from app.services.thematic_search import is_concept_style_query, score_thematic

        search_type = mode_filter or detect_search_type(q)
        themes_matched = match_themes(q)
        if themes_matched and search_type != "arabic":
            search_type = "english"
        q_ar_norm = normalize_arabic(q) if search_type == "arabic" else ""
        q_trans_norm = normalize_transliteration(q) if search_type == "transliteration" else ""
        q_en = q.lower() if search_type == "english" else ""
        concept_query = bool(themes_matched) or is_concept_style_query(q, search_type)
        intent_hint: str | None = None
        if concept_query:
            intent_hint = f"Meaning search · {theme_label_for_query(q) or q}"

        candidates: list[tuple[float, AyahDocument, str, str, dict]] = []

        for doc in self._docs:
            breakdown: dict = {}
            if search_type == "arabic":
                score, reason, breakdown = self._score_arabic(q_ar_norm, doc)
                mode = "arabic"
            elif search_type == "transliteration":
                score, reason = self._score_transliteration(q, q_trans_norm, doc)
                mode = "transliteration"
            else:
                en_score, en_reason = self._score_english(q_en, doc)
                th_score, th_reason, _ = score_thematic(q, doc)
                if concept_query and th_score > 0:
                    score, reason, mode = th_score, th_reason, "thematic"
                elif th_score >= en_score and th_score > 0:
                    score, reason, mode = th_score, th_reason, "thematic"
                else:
                    score, reason, mode = en_score, en_reason, "english"

            if score > 0.15:
                candidates.append((score, doc, mode, reason, breakdown))

        if search_type == "transliteration":
            candidates.sort(
                key=lambda x: (
                    x[0],
                    _transliteration_match_count(q_trans_norm, x[1].transliteration_normalized),
                ),
                reverse=True,
            )
        else:
            # Tie-break toward legacy baseline score so augmentation cannot reorder winners.
            candidates.sort(
                key=lambda x: (x[0], (x[4] or {}).get("baseline", 0.0)),
                reverse=True,
            )

        dbg = None
        if debug:
            dbg = SearchDebug(
                raw_query=q,
                search_type=search_type,
                normalized_query=q_ar_norm or q_trans_norm or q_en,
                top_candidates=[
                    {
                        "surah": d.surah,
                        "ayah": d.ayah,
                        "score": round(s, 4),
                        "mode": m,
                        "reason": r,
                        "breakdown": bd if isinstance(bd, dict) else None,
                    }
                    for s, d, m, r, bd in candidates[:10]
                ],
            )

        primary, weak = self._split_confidence_tiers(candidates, top_k, concept_query=concept_query)
        if concept_query and not intent_hint:
            intent_hint = f"Meaning search · {theme_label_for_query(q) or q}"
        return primary, weak, dbg, intent_hint, concept_query

    def _score_arabic(self, query_norm: str, doc: AyahDocument) -> tuple[float, str, dict]:
        if not query_norm:
            return 0.0, "empty", {}

        targets = [doc.text_ar_normalized]
        if doc.text_ar_search_normalized and doc.text_ar_search_normalized != doc.text_ar_normalized:
            targets.append(doc.text_ar_search_normalized)

        baseline_score = 0.0
        baseline_reason = "no_match"
        for target in targets:
            if not target:
                continue
            s, r = baseline_arabic_score(query_norm, target)
            if s > baseline_score:
                baseline_score, baseline_reason = s, r

        if not self._retrieval_augmentation:
            return baseline_score, baseline_reason, {"baseline": round(baseline_score, 4)}

        best_aug = 0.0
        best_aug_reason = baseline_reason
        best_aug_breakdown: dict = {}

        for target in targets:
            if not target:
                continue
            base, reason = baseline_arabic_score(query_norm, target)
            final, reason, breakdown = combine_arabic_scores(base, reason, query_norm, target)
            if final > best_aug:
                best_aug, best_aug_reason, best_aug_breakdown = final, reason, breakdown

        return merge_baseline_and_augmented(
            baseline_score,
            baseline_reason,
            best_aug,
            best_aug_reason,
            best_aug_breakdown,
        )

    @staticmethod
    def _score_transliteration(
        query_raw: str, query_norm: str, doc: AyahDocument
    ) -> tuple[float, str]:
        if not query_norm:
            return 0.0, "empty"
        score, reason = phrase_similarity(query_norm, doc.transliteration_normalized)
        from app.core.phonetic import encode_query_phonetic

        target = doc.transliteration_normalized or ""
        if target:
            boost = _transliteration_token_boost(query_norm, target)
            if boost > 0 and score < 0.9:
                score = min(0.96, score + boost)
                reason = f"{reason}|token_boost"

        if score < 0.62:
            primary_q, latin_q = encode_query_phonetic(query_raw)
            if target:
                for key, label in ((latin_q, "phonetic_latin"), (primary_q, "phonetic_primary")):
                    if not key or len(key) < 6:
                        continue
                    ts = fuzz.token_set_ratio(key, target) / 100.0
                    if ts > score + 0.12 and ts >= 0.62:
                        score = min(0.94, ts * 0.93)
                        reason = label
        q_content = content_tokens(query_norm)
        if q_content and score < 0.88:
            t_content = set(content_tokens(doc.transliteration_normalized))
            matched = sum(
                1
                for w in q_content
                if w in t_content or any(fuzz.ratio(w, tw) >= 88 for tw in t_content)
            )
            coverage = matched / len(q_content)
            if coverage < 0.5:
                score *= 0.72
                reason = f"{reason}|low_content_coverage"
            elif coverage < 0.75:
                score *= 0.85
                reason = f"{reason}|partial_content"
        return score, reason

    @staticmethod
    def _score_english(query_en: str, doc: AyahDocument) -> tuple[float, str]:
        trans = (doc.translation_en or "").lower()
        if not trans:
            return 0.0, "no_translation"
        if query_en in trans:
            return 0.95, "english_phrase_contains"
        q_words = [w for w in query_en.split() if len(w) > 2]
        if len(q_words) < 2:
            if re.search(rf"\b{re.escape(query_en)}\b", trans):
                return 0.78, "english_keyword"
            partial = fuzz.partial_ratio(query_en, trans) / 100.0
            return partial * 0.65, "english_short_query"
        partial = fuzz.partial_ratio(query_en, trans) / 100.0
        token_sort = fuzz.token_sort_ratio(query_en, trans) / 100.0
        score = max(partial * 0.95, token_sort * 0.75)
        return min(0.96, score), "english_meaning"

    @staticmethod
    def _hit_from(score: float, doc: AyahDocument, mode: str, reason: str) -> SearchHit:
        return SearchHit(
            surah=doc.surah,
            ayah=doc.ayah,
            confidence=round(min(0.99, max(0.0, score)), 4),
            text_ar=doc.text_ar,
            transliteration=doc.transliteration,
            translation_en=doc.translation_en,
            match_mode=mode,
            match_reason=reason,
            raw_score=score,
        )

    @classmethod
    def _split_confidence_tiers(
        cls,
        candidates: list[tuple[float, AyahDocument, str, str, dict]],
        top_k: int,
        concept_query: bool = False,
    ) -> tuple[list[SearchHit], list[SearchHit]]:
        primary: list[SearchHit] = []
        weak: list[SearchHit] = []
        if not candidates:
            return primary, weak

        best = candidates[0][0]
        if best >= CONFIDENCE_HIGH:
            limit = min(3, top_k) if concept_query else 1
            for s, d, m, r, _ in candidates[:limit]:
                if s < CONFIDENCE_HIGH:
                    break
                primary.append(cls._hit_from(s, d, m, r))
                if not concept_query:
                    break
        elif best >= CONFIDENCE_MEDIUM:
            for s, d, m, r, _ in candidates:
                if s < CONFIDENCE_MEDIUM:
                    break
                if len(primary) >= min(3, top_k):
                    break
                primary.append(cls._hit_from(s, d, m, r))
        seen = {(h.surah, h.ayah) for h in primary}
        for s, d, m, r, _ in candidates:
            if s < CONFIDENCE_WEAK_MIN or s >= CONFIDENCE_MEDIUM:
                continue
            if (d.surah, d.ayah) in seen:
                continue
            weak.append(cls._hit_from(s, d, m, r))
            seen.add((d.surah, d.ayah))
            if len(weak) >= 5:
                break

        return primary, weak
