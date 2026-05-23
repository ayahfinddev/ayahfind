"""Local sentence-transformer semantic search."""

from __future__ import annotations

import numpy as np

from app.core.config import Settings, get_settings
from app.services.vector_search import SemanticVectorSearch


class SemanticSearchEngine:
    _model = None  # class-level singleton

    def __init__(
        self,
        vector: SemanticVectorSearch | None = None,
        settings: Settings | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._vector = vector or SemanticVectorSearch(self._settings)
        self._index_available: bool | None = None

    def _semantic_index_ready(self) -> bool:
        if self._index_available is not None:
            return self._index_available
        idx = self._settings.vector_index_dir / "semantic.faiss"
        map_path = self._settings.vector_index_dir / "semantic_id_map.json"
        self._index_available = idx.exists() and map_path.exists()
        return self._index_available

    @classmethod
    def _get_model(cls, model_name: str):
        if cls._model is None:
            from sentence_transformers import SentenceTransformer

            cls._model = SentenceTransformer(model_name)
        return cls._model

    def embed_query(self, query: str) -> np.ndarray:
        model = self._get_model(self._settings.embedding_model)
        vec = model.encode([query], normalize_embeddings=True, show_progress_bar=False)
        return np.asarray(vec[0], dtype=np.float32)

    def search(self, query: str, top_k: int = 50) -> list[tuple[int, float]]:
        if not self._semantic_index_ready():
            return []
        try:
            qvec = self.embed_query(query)
            return self._vector.search(qvec, top_k)
        except Exception:
            return []
