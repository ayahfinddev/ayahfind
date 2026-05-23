"""
Quran ingestion pipeline.
Loads raw JSON (Tanzil-style or internal sample) into normalized staging format.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def load_raw_source(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize_ingested(raw: dict[str, Any]) -> dict[str, Any]:
    """
    Expected raw format:
    {
      "surahs": [{"number": 1, "name_ar": "...", "name_en": "...", ...}],
      "ayahs": [{"surah": 1, "ayah": 1, "text_ar": "...", "transliteration": "...", "translation_en": "..."}]
    }
    """
    surahs = []
    for s in raw.get("surahs", []):
        surahs.append(
            {
                "number": s["number"],
                "name_ar": s.get("name_ar", ""),
                "name_en": s.get("name_en", ""),
                "revelation_type": s.get("revelation_type", "meccan"),
                "ayah_count": s.get("ayah_count", 0),
            }
        )

    ayahs = []
    ayah_id = 1
    for a in raw.get("ayahs", []):
        surah = a.get("surah") or a.get("surah_number")
        ayah_num = a.get("ayah") or a.get("ayah_number")
        ayahs.append(
            {
                "id": ayah_id,
                "surah_number": surah,
                "ayah_number": ayah_num,
                "text_ar": a["text_ar"],
                "transliteration": a.get("transliteration", ""),
                "translation_en": a.get("translation_en", a.get("translation", "")),
                "audio_url": a.get("audio_url"),
                "popularity_score": a.get("popularity_score", 0.0),
            }
        )
        ayah_id += 1

    return {"surahs": surahs, "ayahs": ayahs}


def ingest(source: Path, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    raw = load_raw_source(source)
    normalized = normalize_ingested(raw)
    out_path = out_dir / "quran_staged.json"
    out_path.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path
