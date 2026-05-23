"""
Preprocessing: Arabic normalization, phonetic fingerprints, root extraction (MVP heuristic).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

# Allow imports from backend when running as module from repo root
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.core.arabic_text import arabic_for_search  # noqa: E402
from app.core.phonetic import (  # noqa: E402
    arabic_to_phonetic_primary,
    latin_to_phonetic_latin,
    normalize_arabic,
)

# Simple Arabic root heuristic: strip affixes (MVP only; replace with CAMeL later)
_PREFIXES = ("و", "ف", "ب", "ك", "ل", "ال")
_SUFFIXES = ("ها", "هم", "هن", "كم", "كن", "نا", "ني", "ه", "ة", "ات", "ون", "ين", "ان")


def extract_roots_mvp(text_ar: str) -> list[str]:
    words = normalize_arabic(text_ar).split()
    roots: list[str] = []
    for w in words:
        if len(w) < 3:
            continue
        stem = w
        for p in _PREFIXES:
            if stem.startswith(p) and len(stem) > len(p) + 2:
                stem = stem[len(p) :]
                break
        for s in _SUFFIXES:
            if stem.endswith(s) and len(stem) > len(s) + 2:
                stem = stem[: -len(s)]
                break
        if len(stem) >= 2:
            roots.append(stem[:3] if len(stem) > 3 else stem)
    return list(dict.fromkeys(roots))


def preprocess(staged_path: Path, out_path: Path) -> Path:
    data = json.loads(staged_path.read_text(encoding="utf-8"))
    for row in data["ayahs"]:
        text_ar = row["text_ar"]
        translit = row.get("transliteration", "")
        surah = int(row.get("surah_number", row.get("surah", 0)))
        ayah = int(row.get("ayah_number", row.get("ayah", 0)))
        row["text_ar_normalized"] = normalize_arabic(text_ar)
        row["text_ar_search_normalized"] = arabic_for_search(text_ar, surah, ayah)
        bism_norm = normalize_arabic("بسم الله الرحمن الرحيم")
        ar_norm = row["text_ar_normalized"]
        row["has_basmala_prefix"] = (
            surah not in (1, 9)
            and ayah == 1
            and (ar_norm == bism_norm or ar_norm.startswith(bism_norm + " "))
        )
        row["phonetic_primary"] = arabic_to_phonetic_primary(text_ar)
        row["phonetic_latin"] = latin_to_phonetic_latin(translit) if translit else latin_to_phonetic_latin(
            text_ar.translate(
                str.maketrans(
                    "ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىي",
                    "oaa'w'ibpthjhkhdrzss'dt'g'fqklmnhwyy",
                )
            )
        )
        row["root_words"] = extract_roots_mvp(text_ar)
        row["faiss_semantic_id"] = row["id"] - 1
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_path
