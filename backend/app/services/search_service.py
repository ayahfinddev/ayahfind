"""
Unified search - phonetic + semantic + lexical (OpenSearch) + optional audio.
"""

from __future__ import annotations

import logging
import time
from pathlib import Path

from app.core.config import Settings, get_settings
from app.core.phonetic import detect_script, encode_query_phonetic
from app.core.ranking import ScoredCandidate, fuse_and_rank, fuse_arabic_lexical
from app.models.schemas import SearchCandidate, SearchResponse
from app.services.audio_search import AudioSearchEngine
from app.services.lexical_search import LexicalSearchEngine
from app.services.phonetic_search import PhoneticSearchEngine
from app.services.quran_store import QuranStore
from app.services.semantic_search import SemanticSearchEngine

logger = logging.getLogger("ayahfind.search")


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

        t1 = time.perf_counter()
        lexical_hits = self._lexical.search(q, top_k=retrieve_k)
        timings["lexical_ms"] = round((time.perf_counter() - t1) * 1000, 1)
        timings["lexical_path"] = self._lexical.last_trace.get("path", "")
        timings["lexical_rows_scanned"] = self._lexical.last_trace.get("rows_scanned", 0)
        timings["lexical_rows_augmented"] = self._lexical.last_trace.get("rows_augmented", 0)

        phonetic_hits: list[tuple[int, float]] = []
        semantic_hits: list[tuple[int, float]] = []

        if not is_arabic:
            t2 = time.perf_counter()
            phonetic_hits = self._phonetic.search(q, top_k=retrieve_k)
            timings["phonetic_ms"] = round((time.perf_counter() - t2) * 1000, 1)
            t3 = time.perf_counter()
            semantic_hits = self._semantic.search(q, top_k=retrieve_k)
            timings["semantic_ms"] = round((time.perf_counter() - t3) * 1000, 1)

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

        for ayah_id, score in lexical_hits:
            _upsert(ayah_id, lexical=score)
        for ayah_id, score in phonetic_hits:
            _upsert(ayah_id, phonetic=score)
        for ayah_id, score in semantic_hits:
            _upsert(ayah_id, semantic=score)

        if surah_context:
            for c in candidates.values():
                if c.surah == surah_context:
                    c.popularity += 0.2

        t4 = time.perf_counter()
        if is_arabic and candidates:
            ranked = fuse_arabic_lexical(candidates, top_k)
        else:
            ranked = fuse_and_rank(candidates, self._settings, top_k)
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
                    transliteration=rec.transliteration,
                    translation_en=rec.translation_en,
                    phonetic_score=round(cand.phonetic_score, 4),
                    semantic_score=round(cand.semantic_score, 4),
                    audio_url=rec.audio_url,
                )
            )

        timings["total_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        resp = SearchResponse(
            query=q,
            normalized_query=self._intent_hint(q),
            intent_hint="multi_signal_fusion",
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
