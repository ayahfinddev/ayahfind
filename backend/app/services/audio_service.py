"""
Audio Processing Service (Phase 2 stub).

MVP: text/transliteration path only.
Future: MFCC + local wav2vec encoder + DTW against reference ayah audio.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np


class AudioProcessingService:
    """Local audio feature extraction - no cloud STT."""

    def extract_mfcc(self, wav_path: Path, n_mfcc: int = 13) -> np.ndarray:
        import librosa

        y, sr = librosa.load(str(wav_path), sr=16000, mono=True)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
        return np.mean(mfcc.T, axis=0)

    def speech_to_phonetic_approximation(self, wav_path: Path) -> str:
        """
        Placeholder for local speech encoder output mapped to phonetic key.
        Production: self-hosted wav2vec/HuBERT + phonetic decoder head.
        """
        raise NotImplementedError(
            "Audio phonetic path ships in Phase 2. Use text transliteration search for MVP."
        )
