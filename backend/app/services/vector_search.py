"""FAISS vector search service for semantic retrieval."""

from __future__ import annotations

import json
from pathlib import Path

import faiss
import numpy as np

from app.core.config import Settings, get_settings


class SemanticVectorSearch:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._index: faiss.Index | None = None
        self._id_map: list[int] = []

    def load(self) -> None:
        if self._index is not None:
            return
        idx_dir = self._settings.vector_index_dir
        index_path = idx_dir / "semantic.faiss"
        map_path = idx_dir / "semantic_id_map.json"
        if not index_path.exists():
            raise FileNotFoundError(f"Semantic FAISS index missing: {index_path}. Run indexing CLI.")
        self._index = faiss.read_index(str(index_path))
        self._id_map = json.loads(map_path.read_text(encoding="utf-8"))

    def search(self, query_vector: np.ndarray, top_k: int) -> list[tuple[int, float]]:
        self.load()
        assert self._index is not None
        q = query_vector.astype(np.float32).reshape(1, -1)
        faiss.normalize_L2(q)
        scores, indices = self._index.search(q, min(top_k, self._index.ntotal))
        results: list[tuple[int, float]] = []
        for idx, score in zip(indices[0], scores[0]):
            if idx < 0:
                continue
            ayah_id = self._id_map[idx]
            results.append((ayah_id, float(score)))
        return results
