"""Sync processed JSON into PostgreSQL/SQLite via SQLAlchemy."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "backend"))

from sqlalchemy import delete, select

from app.core.config import get_settings
from app.db.models import Ayah, Surah
from app.db.session import get_session_factory, init_db


async def sync_from_processed(processed_path: Path) -> int:
    settings = get_settings()
    await init_db(settings)
    data = json.loads(processed_path.read_text(encoding="utf-8"))
    factory = get_session_factory(settings)
    count = 0
    async with factory() as session:
        await session.execute(delete(Ayah))
        await session.execute(delete(Surah))
        for s in data.get("surahs", []):
            session.add(Surah(**s))
        for row in data["ayahs"]:
            session.add(
                Ayah(
                    id=row["id"],
                    surah_number=row["surah_number"],
                    ayah_number=row["ayah_number"],
                    text_ar=row["text_ar"],
                    transliteration=row.get("transliteration", ""),
                    translation_en=row.get("translation_en", ""),
                    phonetic_primary=row.get("phonetic_primary", ""),
                    phonetic_latin=row.get("phonetic_latin", ""),
                    root_words=row.get("root_words", []),
                    faiss_semantic_id=row.get("faiss_semantic_id"),
                    popularity_score=row.get("popularity_score", 0.0),
                    audio_url=row.get("audio_url"),
                    mfcc_offset=row.get("mfcc_offset"),
                )
            )
            count += 1
        await session.commit()
    return count


def sync_db(processed_path: Path) -> int:
    return asyncio.run(sync_from_processed(processed_path))
