"""Phonetic fuzzy search over precomputed ayah fingerprints."""

from __future__ import annotations

from rapidfuzz import fuzz

from app.core.phonetic import encode_query_phonetic
from app.services.quran_store import QuranStore


class PhoneticSearchEngine:
    def __init__(self, store: QuranStore) -> None:
        self._store = store

    def search(self, query: str, top_k: int = 50) -> list[tuple[int, float]]:
        primary_q, latin_q = encode_query_phonetic(query)
        scores: list[tuple[int, float]] = []

        for ayah in self._store.ayahs:
            p_score = self._match_score(primary_q, ayah.phonetic_primary)
            l_score = self._match_score(latin_q, ayah.phonetic_latin)
            combined = max(p_score, l_score)
            if ayah.transliteration:
                partial = fuzz.partial_ratio(query.lower(), ayah.transliteration.lower()) / 100.0
                combined = max(combined, partial * 0.85)
            if combined > 0.25:
                scores.append((ayah.id, combined))

        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]

    @staticmethod
    def _match_score(query_key: str, ayah_key: str) -> float:
        if not query_key or not ayah_key:
            return 0.0
        pr = fuzz.partial_ratio(query_key, ayah_key) / 100.0
        wr = fuzz.WRatio(query_key, ayah_key) / 100.0
        return max(pr, wr)
