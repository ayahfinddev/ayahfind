"""
Build MFCC reference bank for Phase 2 audio search.

Uses local WAV files in data/audio/{surah:03d}{ayah:03d}.mp3 when present.
Falls back to phonetic-sequence vectors (13-dim) for ayahs without audio.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "backend"))

from app.core.config import get_settings
from app.core.phonetic import latin_to_phonetic_latin


def _phonetic_mfcc_proxy(phonetic: str, n_mfcc: int = 13) -> np.ndarray:
    """Deterministic 13-dim vector from phonetic string when no WAV available."""
    vec = np.zeros(n_mfcc, dtype=np.float32)
    for i, ch in enumerate(phonetic[:64]):
        vec[i % n_mfcc] += (ord(ch) % 32) / 32.0
    norm = np.linalg.norm(vec)
    return vec / norm if norm > 1e-9 else vec


def _wav_mfcc(path: Path, n_mfcc: int = 13) -> np.ndarray:
    import librosa

    y, sr = librosa.load(str(path), sr=16000, mono=True)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    return np.mean(mfcc.T, axis=0).astype(np.float32)


def build_mfcc_bank(processed_path: Path, out_path: Path) -> int:
    settings = get_settings()
    settings.audio_dir.mkdir(parents=True, exist_ok=True)
    data = json.loads(processed_path.read_text(encoding="utf-8"))

    vectors: list[np.ndarray] = []
    id_map: list[int] = []
    offsets: dict[int, int] = {}

    for row in data["ayahs"]:
        surah, ayah = row["surah_number"], row["ayah_number"]
        wav = settings.audio_dir / f"{surah:03d}{ayah:03d}.mp3"
        phon = row.get("phonetic_latin") or latin_to_phonetic_latin(
            row.get("transliteration", "")
        )
        if wav.exists():
            vec = _wav_mfcc(wav)
        else:
            vec = _phonetic_mfcc_proxy(phon)
        offsets[row["id"]] = len(vectors)
        id_map.append(row["id"])
        vectors.append(vec)

    matrix = np.stack(vectors, axis=0)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        out_path,
        mfcc=matrix,
        id_map=np.array(id_map, dtype=np.int32),
    )

    # write offsets back for DB sync
    for row in data["ayahs"]:
        row["mfcc_offset"] = offsets.get(row["id"])
    processed_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"MFCC bank: {matrix.shape} -> {out_path}")
    return len(vectors)
