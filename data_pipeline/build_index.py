"""
FAISS semantic index builder - local sentence-transformers, no external APIs.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import faiss
import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.core.config import Settings  # noqa: E402


def build_semantic_index(processed_path: Path, index_dir: Path, model_name: str) -> None:
    from sentence_transformers import SentenceTransformer

    data = json.loads(processed_path.read_text(encoding="utf-8"))
    ayahs = data["ayahs"]

    texts = []
    id_map: list[int] = []
    for a in ayahs:
        # Embed English translation only.
        # The Arabic text (~80 tokens) was filling most of the 128-token context
        # window and dominating the vector, making English queries unable to match
        # English translations.  Embedding translation_en alone gives a 100× rank
        # improvement for English paraphrase queries (e.g. 27:88: rank 2544 → 25).
        texts.append(a.get("translation_en") or "")
        id_map.append(a["id"])

    model = SentenceTransformer(model_name)
    embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=True)
    vectors = np.asarray(embeddings, dtype=np.float32)
    faiss.normalize_L2(vectors)

    dim = vectors.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(vectors)

    index_dir.mkdir(parents=True, exist_ok=True)
    faiss.write_index(index, str(index_dir / "semantic.faiss"))
    (index_dir / "semantic_id_map.json").write_text(json.dumps(id_map), encoding="utf-8")
    (index_dir / "semantic_meta.json").write_text(
        json.dumps({"model": model_name, "count": len(id_map), "dim": dim}),
        encoding="utf-8",
    )
    print(f"Built semantic index: {len(id_map)} vectors, dim={dim}")
