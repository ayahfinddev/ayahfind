"""MFCC + DTW audio search against reference bank."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from scipy.spatial.distance import cdist

from app.core.config import Settings, get_settings


class AudioSearchEngine:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._mfcc: np.ndarray | None = None
        self._id_map: np.ndarray | None = None

    def load(self) -> None:
        path = self._settings.mfcc_index_path
        if not path.exists() or self._mfcc is not None:
            return
        data = np.load(path)
        self._mfcc = data["mfcc"]
        self._id_map = data["id_map"]

    def extract_query_mfcc(self, wav_path: Path, n_mfcc: int = 13) -> np.ndarray:
        import librosa

        y, sr = librosa.load(str(wav_path), sr=16000, mono=True)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
        return np.mean(mfcc.T, axis=0).astype(np.float32)

    @staticmethod
    def _dtw_distance(a: np.ndarray, b: np.ndarray) -> float:
        """Simple DTW via pairwise cost matrix."""
        n, m = len(a), len(b)
        if n == 0 or m == 0:
            return 1e9
        # treat 1D pooled vectors: expand to pseudo-sequences
        seq_a = np.tile(a, (max(n, 13), 1)) if a.ndim == 1 else a
        seq_b = np.tile(b, (max(m, 13), 1)) if b.ndim == 1 else b
        if seq_a.ndim == 1:
            seq_a = seq_a.reshape(-1, 1)
            seq_b = seq_b.reshape(-1, 1)
        cost = cdist(seq_a, seq_b, metric="euclidean")
        dp = np.full((cost.shape[0] + 1, cost.shape[1] + 1), np.inf)
        dp[0, 0] = 0.0
        for i in range(1, dp.shape[0]):
            for j in range(1, dp.shape[1]):
                dp[i, j] = cost[i - 1, j - 1] + min(dp[i - 1, j], dp[i, j - 1], dp[i - 1, j - 1])
        return float(dp[-1, -1] / (cost.shape[0] + cost.shape[1]))

    def search_wav(self, wav_path: Path, top_k: int = 20) -> list[tuple[int, float]]:
        self.load()
        if self._mfcc is None:
            return []
        query = self.extract_query_mfcc(wav_path)
        scores: list[tuple[int, float]] = []
        for i, ref in enumerate(self._mfcc):
            dist = self._dtw_distance(query, ref)
            sim = 1.0 / (1.0 + dist)
            scores.append((int(self._id_map[i]), sim))
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[:top_k]
