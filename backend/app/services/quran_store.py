"""
Quran Data Service - PostgreSQL/SQLite primary, JSON fallback.
"""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass

from sqlalchemy import select

from app.core.config import Settings, get_settings


@dataclass
class AyahRecord:
    id: int
    surah_number: int
    ayah_number: int
    text_ar: str
    transliteration: str
    translation_en: str
    phonetic_primary: str
    phonetic_latin: str
    root_words: list[str]
    faiss_semantic_id: int
    popularity_score: float = 0.0
    audio_url: str | None = None
    mfcc_offset: int | None = None
    text_ar_normalized: str = ""
    transliteration_normalized: str = ""


@dataclass
class SurahMeta:
    number: int
    name_ar: str
    name_en: str
    revelation_type: str
    ayah_count: int


class QuranStore:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._ayahs: list[AyahRecord] = []
        self._by_id: dict[int, AyahRecord] = {}
        self._by_ref: dict[tuple[int, int], AyahRecord] = {}
        self._surahs: dict[int, SurahMeta] = {}
        self._loaded = False

    def load(self) -> None:
        if self._loaded:
            return
        if self._settings.use_database:
            try:
                asyncio.get_event_loop().run_until_complete(self._load_db())
                if self._ayahs:
                    self._loaded = True
                    return
    
            except Exception as e:
                print(f"DB load failed, falling back to JSON: {e}")
        self._load_json()
        self._loaded = True

    async def aload(self) -> None:
        if self._loaded:
            return
        if self._settings.use_database:
            try:
                await self._load_db()
                if self._ayahs:
                    self._loaded = True
                    return
            except Exception as e:
                print(f"DB load failed, falling back to JSON: {e}")
        self._load_json()
        self._loaded = True

    async def _load_db(self) -> None:
        from app.db.models import Ayah, Surah
        from app.db.session import get_session_factory, init_db

        await init_db(self._settings)
        factory = get_session_factory(self._settings)
        async with factory() as session:
            surah_rows = (await session.execute(select(Surah))).scalars().all()
            if not surah_rows:
                return
            for s in surah_rows:
                self._surahs[s.number] = SurahMeta(
                    number=s.number,
                    name_ar=s.name_ar,
                    name_en=s.name_en,
                    revelation_type=s.revelation_type,
                    ayah_count=s.ayah_count,
                )
            ayah_rows = (await session.execute(select(Ayah))).scalars().all()
            for a in ayah_rows:
                audio = a.audio_url or self._settings.audio_cdn_template.format(
                    surah=a.surah_number, ayah=a.ayah_number
                )
                rec = AyahRecord(
                    id=a.id,
                    surah_number=a.surah_number,
                    ayah_number=a.ayah_number,
                    text_ar=a.text_ar,
                    transliteration=a.transliteration or "",
                    translation_en=a.translation_en or "",
                    phonetic_primary=a.phonetic_primary or "",
                    phonetic_latin=a.phonetic_latin or "",
                    root_words=a.root_words or [],
                    faiss_semantic_id=a.faiss_semantic_id or (a.id - 1),
                    popularity_score=a.popularity_score or 0.0,
                    audio_url=audio,
                    mfcc_offset=a.mfcc_offset,
                    text_ar_normalized=getattr(a, "text_ar_normalized", "") or "",
                    transliteration_normalized=getattr(a, "transliteration_normalized", "") or "",
                )
                self._ayahs.append(rec)
                self._by_id[rec.id] = rec
                self._by_ref[(rec.surah_number, rec.ayah_number)] = rec

    def _load_json(self) -> None:
        path = self._settings.processed_dir / "ayahs_processed.json"
        if not path.exists():
            raise FileNotFoundError(f"Processed ayah file not found: {path}")
        raw = json.loads(path.read_text(encoding="utf-8"))
        for row in raw["ayahs"]:
            audio = row.get("audio_url") or self._settings.audio_cdn_template.format(
                surah=row["surah_number"], ayah=row["ayah_number"]
            )
            rec = AyahRecord(
                id=row["id"],
                surah_number=row["surah_number"],
                ayah_number=row["ayah_number"],
                text_ar=row["text_ar"],
                transliteration=row.get("transliteration", ""),
                translation_en=row.get("translation_en", ""),
                phonetic_primary=row.get("phonetic_primary", ""),
                phonetic_latin=row.get("phonetic_latin", ""),
                root_words=row.get("root_words", []),
                faiss_semantic_id=row.get("faiss_semantic_id", row["id"] - 1),
                popularity_score=row.get("popularity_score", 0.0),
                audio_url=audio,
                mfcc_offset=row.get("mfcc_offset"),
                text_ar_normalized=row.get("text_ar_normalized", ""),
                transliteration_normalized=row.get("transliteration_normalized", ""),
            )
            self._ayahs.append(rec)
            self._by_id[rec.id] = rec
            self._by_ref[(rec.surah_number, rec.ayah_number)] = rec
        for s in raw.get("surahs", []):
            self._surahs[s["number"]] = SurahMeta(**s)

    @property
    def ayahs(self) -> list[AyahRecord]:
        self.load()
        return self._ayahs

    def get_by_ref(self, surah: int, ayah: int) -> AyahRecord | None:
        self.load()
        return self._by_ref.get((surah, ayah))

    def get_surah_ayahs(self, surah: int) -> list[AyahRecord]:
        self.load()
        return sorted(
            [a for a in self._ayahs if a.surah_number == surah],
            key=lambda a: a.ayah_number,
        )

    def get_surah_meta(self, surah: int) -> SurahMeta | None:
        self.load()
        return self._surahs.get(surah)
