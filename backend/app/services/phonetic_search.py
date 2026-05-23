"""Phonetic fuzzy search over precomputed ayah fingerprints."""

from __future__ import annotations

from rapidfuzz import fuzz

from app.core.arabic_text import arabic_for_search, arabic_to_latin_transliteration
from app.core.phonetic import arabic_to_phonetic_primary, encode_query_phonetic, latin_to_phonetic_latin
from app.core.transliteration import normalize_transliteration
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
            search_ar = arabic_for_search(ayah.text_ar, ayah.surah_number, ayah.ayah_number)
            if search_ar and len(search_ar) >= 8:
                alt_primary = arabic_to_phonetic_primary(search_ar)
                alt_latin = latin_to_phonetic_latin(arabic_to_latin_transliteration(search_ar))
                combined = max(
                    combined,
                    self._match_score(primary_q, alt_primary),
                )
                if len(alt_latin) >= 8:
                    combined = max(combined, self._match_score(latin_q, alt_latin))
                if not ayah.transliteration:
                    alt_trans = normalize_transliteration(
                        arabic_to_latin_transliteration(search_ar)
                    )
                    if len(alt_trans) >= 10:
                        partial = fuzz.partial_ratio(query.lower(), alt_trans) / 100.0
                        combined = max(combined, partial * 0.85)
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
