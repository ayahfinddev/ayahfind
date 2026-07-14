"""
Unified search - phonetic + semantic + lexical (OpenSearch) + optional audio.
"""

from __future__ import annotations

import logging
import re
import time
from pathlib import Path

from app.core.arabic_text import arabic_for_display
from app.core.config import Settings, get_settings
from app.core.phonetic import detect_script, encode_query_phonetic
from app.core.ranking import (
    ScoredCandidate,
    fuse_and_rank,
    fuse_arabic_lexical,
    fuse_english_lexical,
)
from app.core.transliteration import detect_search_type
from app.core.typo_correction import correct_query, known_english_vocab
from app.models.schemas import SearchCandidate, SearchResponse
from app.core.thematic_lexicon import match_themes
from app.services.audio_search import AudioSearchEngine
from app.services.lexical_search import LexicalSearchEngine
from app.services.phonetic_search import PhoneticSearchEngine
from app.services.quran_store import QuranStore
from app.services.semantic_search import SemanticSearchEngine
from app.services.thematic_search import (
    anchor_scores,
    keyword_candidate_ids,
    passes_theme_exclusions,
    score_rows_for_themes,
    theme_intent_hint,
)

logger = logging.getLogger("ayahfind.search")

# ── Query classification ──────────────────────────────────────────────────────
# Structural rules only — no vocabulary lists. Returns (type, phon_w, sem_w, lex_w).
_ARABIC_RANGE_RE = re.compile(r"[؀-ۿ]")


def classify_query(query: str) -> tuple[str, float, float, float]:
    """
    Classify query into (type, phonetic_w, semantic_w, lexical_w).

    Priority order:
      1. arabic       — >40 % non-whitespace chars in U+0600–U+06FF
      2. transliteration — detect_search_type() says so (see transliteration.py:
         English-marker check, then Arabic particle/verbal-form patterns, then a
         short-Latin-without-English-markers fallback)
      3. descriptive  — >4 words, Latin script
      4. keyword      — default (short Latin query)

    transliteration detection used to be re-derived here with its own narrow
    word list, separate from (and narrower than) detect_search_type — which
    meant a query like "alhamdu lillahi rabbil alameen" (obviously
    transliterated Arabic, but not on that list) fell into the generic
    "keyword" weight profile, where semantic's higher weight let noise from
    an unrelated verse beat the correct exact match despite phonetic scoring
    it correctly. Reusing detect_search_type keeps one classifier instead of
    two drifting out of sync — but its "short Latin phrase, no recognized
    marker word" fallback is too eager on its own: ordinary English queries
    using vocabulary outside its curated marker list (e.g. "Allah expands
    provision", "Maryam childbirth") would misfire the same way. Gating on
    known_english_vocab (the corpus's own translation_en vocabulary, already
    built for typo correction) tells real English words from transliterated
    Arabic generally, without hand-listing exceptions.
    """
    q = query.strip()
    non_ws = [c for c in q if not c.isspace()]
    arabic_count = sum(1 for c in non_ws if "؀" <= c <= "ۿ")
    if non_ws and arabic_count / len(non_ws) > 0.40:
        logger.debug("classify_query type=arabic q=%r", q)
        return ("arabic", 0.55, 0.30, 0.15)

    words = q.split()

    # Bounded to 2-4 words, matching the original design's cutoff for this
    # bucket: a single word is too ambiguous between "obscure English
    # vocabulary" (e.g. "hypocrisy", "zakat") and "transliteration" for
    # detect_search_type's marker-absence fallback to be reliable, and >4
    # words is the descriptive-English bucket below regardless.
    if 2 <= len(words) <= 4 and detect_search_type(q) == "transliteration":
        content_words = [w for w in re.findall(r"[a-z']+", q.lower()) if len(w) > 2]
        vocab = known_english_vocab(LexicalSearchEngine._rows(get_settings()))
        known_ratio = (
            sum(1 for w in content_words if w in vocab) / len(content_words)
            if content_words else 0.0
        )
        if known_ratio < 0.5:
            logger.debug("classify_query type=transliteration q=%r", q)
            return ("transliteration", 0.50, 0.30, 0.20)

    # Descriptive English: >4 Latin words, none of the above
    if len(words) > 4:
        logger.debug("classify_query type=descriptive q=%r", q)
        return ("descriptive", 0.10, 0.75, 0.15)

    # Default: short English keyword query
    logger.debug("classify_query type=keyword q=%r", q)
    return ("keyword", 0.40, 0.35, 0.15)


class SearchService:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._store = QuranStore(self._settings)
        self._phonetic = PhoneticSearchEngine(self._store)
        self._semantic = SemanticSearchEngine(settings=self._settings)
        self._lexical = LexicalSearchEngine(self._settings)
        self._audio = AudioSearchEngine(self._settings)

    def _intent_hint(self, query: str) -> str:
        primary, latin = encode_query_phonetic(query)
        if primary == latin:
            return f"phonetic_latin:{latin}"
        return f"phonetic_dual:ar={primary}|latin={latin}"

    def _clamp_query(self, query: str) -> str:
        max_len = self._settings.search_max_query_length
        q = query.strip()
        if len(q) > max_len:
            logger.warning("query_truncated from=%s to=%s", len(q), max_len)
            return q[:max_len]
        return q

    def unified_search_timed(
        self, query: str, top_k: int, surah_context: int | None = None
    ) -> tuple[SearchResponse, dict[str, float]]:
        timings: dict[str, float] = {}
        t0 = time.perf_counter()

        q = self._clamp_query(query)
        self._store.load()
        timings["store_load_ms"] = round((time.perf_counter() - t0) * 1000, 1)

        retrieve_k = self._settings.search_top_k_retrieve
        is_arabic = detect_script(q) == "arabic"
        is_english_prose = not is_arabic and detect_search_type(q) == "english"
        themes = match_themes(q) if not is_arabic else []
        concept_query = bool(themes)
        # concept_only: the query itself basically *is* the concept (short —
        # "zakat", "sabr patience"), so anchor-only routing is safe. Longer
        # sentences that merely *mention* a concept word ("...out of fear of
        # poverty") still get full multi-signal fusion, with the concept's
        # anchors added as a credit boost — replacing candidates outright
        # for these was discarding the correct non-anchor verse whenever the
        # sentence's real target wasn't one of that concept's anchors.
        concept_only = concept_query and len(q.split()) <= 6

        # classify_query provides per-query fusion weights and logs the type.
        q_type, wp, ws, wl = classify_query(q)
        logger.info(
            "classify_query q=%r type=%s weights=(phon=%.2f sem=%.2f lex=%.2f)",
            q, q_type, wp, ws, wl,
        )
        timings["query_type"] = q_type
        timings["weights_phonetic"] = wp
        timings["weights_semantic"] = ws
        timings["weights_lexical"] = wl

        corrected_form: str | None = None
        if not is_arabic and q_type in ("keyword", "descriptive"):
            rows = LexicalSearchEngine._rows(self._settings)
            q_corrected, corrected_form = correct_query(q, rows)
            if corrected_form:
                logger.info("typo_corrected q=%r -> %r", q, q_corrected)
                q = q_corrected
                q_type, wp, ws, wl = classify_query(q)
                is_english_prose = detect_search_type(q) == "english"
                themes = match_themes(q)
                concept_query = bool(themes)
                concept_only = concept_query and len(q.split()) <= 6

        if concept_query:
            intent_hint = theme_intent_hint(q)
        elif corrected_form:
            intent_hint = f"Showing results for '{corrected_form}'"
        else:
            intent_hint = f"multi_signal_fusion:{q_type}"

        t1 = time.perf_counter()
        lexical_hits = self._lexical.search(q, top_k=retrieve_k)
        timings["lexical_ms"] = round((time.perf_counter() - t1) * 1000, 1)
        timings["lexical_path"] = self._lexical.last_trace.get("path", "")
        timings["lexical_rows_scanned"] = self._lexical.last_trace.get("rows_scanned", 0)
        timings["lexical_rows_augmented"] = self._lexical.last_trace.get("rows_augmented", 0)
        if is_english_prose:
            timings["english_normalized_query"] = self._lexical.last_trace.get("normalized_query", "")
            timings["english_content_tokens"] = self._lexical.last_trace.get("content_tokens", [])
            timings["english_token_weights"] = self._lexical.last_trace.get("token_weights", {})
            timings["english_top_breakdown"] = self._lexical.last_trace.get("top_breakdown", [])

        phonetic_hits: list[tuple[int, float]] = []
        semantic_hits: list[tuple[int, float]] = []

        if not is_arabic and not concept_only and not is_english_prose:
            # Transliteration / phonetic recall queries: run all three engines.
            t2 = time.perf_counter()
            phonetic_hits = self._phonetic.search(q, top_k=retrieve_k)
            timings["phonetic_ms"] = round((time.perf_counter() - t2) * 1000, 1)
            t3 = time.perf_counter()
            semantic_hits = self._semantic.search(q, top_k=retrieve_k)
            timings["semantic_ms"] = round((time.perf_counter() - t3) * 1000, 1)
        elif is_english_prose and not concept_only:
            # English prose (descriptive/keyword): skip phonetic, run semantic.
            t3 = time.perf_counter()
            semantic_hits = self._semantic.search(q, top_k=retrieve_k)
            timings["semantic_ms"] = round((time.perf_counter() - t3) * 1000, 1)
            timings["phonetic_skipped"] = 1.0
            logger.debug(
                "english_search q=%r type=%s normalized=%r tokens=%s top=%s",
                q,
                q_type,
                self._lexical.last_trace.get("normalized_query"),
                self._lexical.last_trace.get("content_tokens"),
                self._lexical.last_trace.get("top_breakdown"),
            )

        candidates: dict[int, ScoredCandidate] = {}

        def _upsert(
            ayah_id: int,
            phonetic: float = 0.0,
            semantic: float = 0.0,
            lexical: float = 0.0,
        ) -> None:
            rec = self._store._by_id.get(ayah_id)
            if not rec:
                return
            if ayah_id not in candidates:
                candidates[ayah_id] = ScoredCandidate(
                    surah=rec.surah_number,
                    ayah=rec.ayah_number,
                    ayah_id=ayah_id,
                    popularity=rec.popularity_score,
                )
            c = candidates[ayah_id]
            c.phonetic_score = max(c.phonetic_score, phonetic)
            c.semantic_score = max(c.semantic_score, semantic)
            c.lexical_score = max(c.lexical_score, lexical)

        if concept_only and themes:
            rows = LexicalSearchEngine._rows(self._settings)
            rows_by_id = {int(row["id"]): row for row in rows}
            theme_ids: set[int] = set()
            for ref in anchor_scores(themes):
                rec = self._store.get_by_ref(ref[0], ref[1])
                if rec:
                    theme_ids.add(rec.id)
            for aid in keyword_candidate_ids(rows, themes):
                theme_ids.add(aid)
            for aid, _ in lexical_hits[:20]:
                theme_ids.add(aid)

            candidates.clear()
            for ref, asc in anchor_scores(themes).items():
                rec = self._store.get_by_ref(ref[0], ref[1])
                if rec:
                    _upsert(rec.id, lexical=asc)
            for aid, th_score, _ in score_rows_for_themes(q, rows_by_id, list(theme_ids), themes):
                if th_score >= 0.52:
                    _upsert(aid, lexical=th_score)
        else:
            for ayah_id, score in lexical_hits:
                _upsert(ayah_id, lexical=score)
            for ayah_id, score in phonetic_hits:
                _upsert(ayah_id, phonetic=score)
            for ayah_id, score in semantic_hits:
                _upsert(ayah_id, semantic=score)
            if concept_query and themes:
                # Concept word appears in a longer sentence — add its
                # anchors as a credit boost on top of normal multi-signal
                # candidates, rather than replacing them (see concept_only).
                for ref, asc in anchor_scores(themes).items():
                    rec = self._store.get_by_ref(ref[0], ref[1])
                    if rec:
                        _upsert(rec.id, lexical=asc)

        if surah_context:
            for c in candidates.values():
                if c.surah == surah_context:
                    c.popularity += 0.2

        t4 = time.perf_counter()
        if is_arabic and candidates:
            ranked = fuse_arabic_lexical(candidates, top_k)
        elif concept_only:
            ranked = fuse_and_rank(candidates, self._settings, top_k)
        elif is_english_prose:
            # English prose (descriptive / keyword): lexical is the reliable
            # signal; semantic adds a controlled additive boost.  fuse_and_rank
            # with min-max normalisation would collapse the absolute lexical
            # advantage of the correct verse (semantic gives many irrelevant
            # "mountains" verses high scores, burying lexical-only results).
            # Keep fuse_english_lexical which preserves absolute lexical scores.
            ranked = fuse_english_lexical(candidates, top_k)
        else:
            # Transliteration / phonetic recall: classify_query weights guide
            # the balance between phonetic and semantic signals.
            ranked = fuse_and_rank(
                candidates, self._settings, top_k,
                weight_override=(wp, ws, wl),
            )
        timings["rank_ms"] = round((time.perf_counter() - t4) * 1000, 1)

        results: list[SearchCandidate] = []
        for cand, confidence in ranked:
            rec = self._store._by_id[cand.ayah_id]
            results.append(
                SearchCandidate(
                    surah=cand.surah,
                    ayah=cand.ayah,
                    confidence=round(confidence, 4),
                    text_ar=rec.text_ar,
                    text_ar_display=arabic_for_display(
                        rec.text_ar, rec.surah_number, rec.ayah_number
                    ),
                    transliteration=rec.transliteration,
                    translation_en=rec.translation_en,
                    phonetic_score=round(cand.phonetic_score, 4),
                    semantic_score=round(cand.semantic_score, 4),
                    audio_url=rec.audio_url,
                )
            )

        if concept_only and themes:
            anchor_refs = set(anchor_scores(themes).keys())
            filtered: list[SearchCandidate] = []
            for r in results:
                trans = (r.translation_en or "").lower()
                if (r.surah, r.ayah) in anchor_refs or passes_theme_exclusions(trans, themes):
                    filtered.append(r)
            results = filtered[:top_k]
            def _theme_rank(r: SearchCandidate) -> tuple:
                trans = (r.translation_en or "").lower()
                is_anchor = (r.surah, r.ayah) in anchor_refs
                # Anchors first; then verses that pass exclusions; demote any edge-case leakage.
                excluded = 0 if is_anchor or passes_theme_exclusions(trans, themes) else 1
                grateful_boost = 0
                if not is_anchor and any(
                    t.id == "gratitude" for t in themes
                ):
                    if re.search(r"\b(grateful|gratitude|thankful|thanks)\b", trans):
                        grateful_boost = -1
                return (excluded, grateful_boost, 0 if is_anchor else 1, -r.confidence)

            results.sort(key=_theme_rank)

        timings["total_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        resp = SearchResponse(
            query=q,
            normalized_query=self._intent_hint(q),
            intent_hint=intent_hint,
            results=results,
        )
        return resp, timings

    def unified_search(
        self, query: str, top_k: int, surah_context: int | None = None
    ) -> SearchResponse:
        resp, _ = self.unified_search_timed(query, top_k, surah_context)
        return resp

    def audio_search(self, wav_path: Path, top_k: int) -> SearchResponse:
        self._store.load()
        retrieve_k = self._settings.search_top_k_retrieve
        hits = self._audio.search_wav(wav_path, top_k=retrieve_k)
        candidates: dict[int, ScoredCandidate] = {}
        for ayah_id, score in hits:
            rec = self._store._by_id.get(ayah_id)
            if not rec:
                continue
            candidates[ayah_id] = ScoredCandidate(
                surah=rec.surah_number,
                ayah=rec.ayah_number,
                ayah_id=ayah_id,
                phonetic_score=score,
                popularity=rec.popularity_score,
            )
        ranked = fuse_and_rank(candidates, self._settings, top_k)
        results = []
        for cand, confidence in ranked:
            rec = self._store._by_id[cand.ayah_id]
            results.append(
                SearchCandidate(
                    surah=cand.surah,
                    ayah=cand.ayah,
                    confidence=round(confidence, 4),
                    text_ar=rec.text_ar,
                    text_ar_display=arabic_for_display(
                        rec.text_ar, rec.surah_number, rec.ayah_number
                    ),
                    transliteration=rec.transliteration,
                    translation_en=rec.translation_en,
                    phonetic_score=round(cand.phonetic_score, 4),
                    audio_url=rec.audio_url,
                )
            )
        return SearchResponse(
            query="[audio]",
            intent_hint="mfcc_dtw",
            results=results,
        )
