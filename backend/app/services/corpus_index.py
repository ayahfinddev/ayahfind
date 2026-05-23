"""In-memory corpus index: pre-normalized fields, query plans, thematic anchors."""

from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache

from app.core.arabic_text import normalize_arabic
from app.core.transliteration import detect_search_type, normalize_transliteration
from app.services.quran_store import AyahRecord, QuranStore


@dataclass(frozen=True)
class QueryPlan:
    search_type: str
    q_ar_norm: str
    q_trans_norm: str
    q_en: str
    theme_ids: tuple[str, ...]
    run_phonetic: bool
    run_semantic: bool
    lexical_first: bool


@dataclass
class IndexedAyah:
    id: int
    surah: int
    ayah: int
    text_ar: str
    text_ar_normalized: str
    transliteration: str
    transliteration_normalized: str
    translation_en: str
    phonetic_primary: str
    phonetic_latin: str
    popularity: float


class CorpusIndex:
    """Singleton-style index built once from QuranStore."""

    def __init__(self, store: QuranStore) -> None:
        store.load()
        self._by_id: dict[int, IndexedAyah] = {}
        self._ref_to_id: dict[tuple[int, int], int] = {}
        self._rows: list[IndexedAyah] = []
        for rec in store.ayahs:
            ar_norm = getattr(rec, "text_ar_normalized", None) or normalize_arabic(rec.text_ar)
            trans = rec.transliteration or ""
            trans_norm = getattr(rec, "transliteration_normalized", None) or ""
            if trans and not trans_norm:
                trans_norm = normalize_transliteration(trans)
            row = IndexedAyah(
                id=rec.id,
                surah=rec.surah_number,
                ayah=rec.ayah_number,
                text_ar=rec.text_ar,
                text_ar_normalized=ar_norm,
                transliteration=trans,
                transliteration_normalized=trans_norm,
                translation_en=rec.translation_en or "",
                phonetic_primary=rec.phonetic_primary or "",
                phonetic_latin=rec.phonetic_latin or "",
                popularity=rec.popularity_score,
            )
            self._rows.append(row)
            self._by_id[rec.id] = row
            self._ref_to_id[(rec.surah_number, rec.ayah_number)] = rec.id

    @property
    def rows(self) -> list[IndexedAyah]:
        return self._rows

    def get(self, ayah_id: int) -> IndexedAyah | None:
        return self._by_id.get(ayah_id)

    def plan_query(self, query: str) -> QueryPlan:
        q = query.strip()
        search_type = detect_search_type(q)
        from app.core.thematic_lexicon import match_themes

        themes = match_themes(q)
        theme_ids = tuple(t.id for t in themes)
        if themes and search_type != "arabic":
            search_type = "english"

        q_ar_norm = normalize_arabic(q) if search_type == "arabic" else ""
        q_trans_norm = normalize_transliteration(q) if search_type == "transliteration" else ""
        q_en = q.lower() if search_type == "english" else ""

        run_phonetic = search_type in ("transliteration", "arabic") or (
            search_type == "english" and len(q) < 80
        )
        run_semantic = search_type == "english" and len(q) >= 3 and not theme_ids

        return QueryPlan(
            search_type=search_type,
            q_ar_norm=q_ar_norm,
            q_trans_norm=q_trans_norm,
            q_en=q_en,
            theme_ids=theme_ids,
            run_phonetic=run_phonetic,
            run_semantic=run_semantic,
            lexical_first=True,
        )

    def thematic_anchor_hits(self, plan: QueryPlan) -> list[tuple[int, float]]:
        if not plan.theme_ids:
            return []
        from app.core.thematic_lexicon import THEMES

        hits: list[tuple[int, float]] = []
        for theme in THEMES:
            if theme.id not in plan.theme_ids:
                continue
            for i, (s, a) in enumerate(theme.anchors):
                aid = self._ref_to_id.get((s, a))
                if aid is None:
                    continue
                hits.append((aid, min(0.97, 0.93 + (len(theme.anchors) - i) * 0.015)))
        return hits


@lru_cache(maxsize=256)
def normalize_query_cached(query: str, search_type: str) -> tuple[str, str, str]:
    q = query.strip()
    q_ar = normalize_arabic(q) if search_type == "arabic" else ""
    q_trans = normalize_transliteration(q) if search_type == "transliteration" else ""
    q_en = q.lower() if search_type == "english" else ""
    return q_ar, q_trans, q_en
