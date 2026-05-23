"""Deployment diagnostics (health / debug-search)."""

from __future__ import annotations

import os
import time
import traceback
from typing import Any

from fastapi import Request

from app.core.config import REPO_ROOT, get_settings
from app.core.runtime_metrics import memory_status, uptime_seconds
from app.services.search_service import SearchService


def build_health_payload(request: Request) -> dict[str, Any]:
    settings = get_settings()
    processed = settings.processed_dir / "ayahs_processed.json"
    semantic_idx = settings.vector_index_dir / "semantic.faiss"
    semantic_map = settings.vector_index_dir / "semantic_id_map.json"
    startup_errors: list[str] = getattr(request.app.state, "startup_errors", []) or []

    ayah_count = getattr(request.app.state, "ayah_count", None)
    if ayah_count is None:
        try:
            from app.services.quran_store import QuranStore

            store = QuranStore(settings)
            store.load()
            ayah_count = len(store.ayahs)
        except Exception as e:
            return {
                "status": "degraded",
                "backend_alive": True,
                "service": "ayahfind",
                "error": str(e),
                "processed_path": str(processed),
                "processed_exists": processed.exists(),
                "startup_errors": startup_errors,
                "uptime_seconds": uptime_seconds(),
                "memory": memory_status(),
            }

    corpus_ok = processed.exists() and processed.stat().st_size > 50_000
    ready = bool(ayah_count and ayah_count > 0 and corpus_ok)

    return {
        "status": "ok" if ready else "degraded",
        "backend_alive": True,
        "service": "ayahfind",
        "ayah_count": ayah_count or 0,
        "dataset_loaded": bool(ayah_count and ayah_count > 0),
        "corpus_ready": corpus_ok,
        "semantic_index": semantic_idx.exists() and semantic_map.exists(),
        "model_loaded": semantic_idx.exists() and semantic_map.exists(),
        "processed_path": str(processed),
        "processed_bytes": processed.stat().st_size if processed.exists() else 0,
        "use_database": settings.use_database,
        "repo_root": str(REPO_ROOT),
        "vector_index_dir": str(settings.vector_index_dir),
        "public_api_url": os.environ.get("PUBLIC_API_URL", ""),
        "startup_errors": startup_errors,
        "uptime_seconds": uptime_seconds(),
        "memory": memory_status(),
    }


def build_debug_search_payload(
    request: Request,
    query: str = "qul huwa allahu ahad",
    top_k: int = 3,
) -> dict[str, Any]:
    settings = get_settings()
    health = build_health_payload(request)
    out: dict[str, Any] = {
        "health": health,
        "test_query": query,
        "environment": {
            "AYAHFIND_ROOT": os.environ.get("AYAHFIND_ROOT", ""),
            "USE_DATABASE": os.environ.get("USE_DATABASE", ""),
            "OPENSEARCH_ENABLED": os.environ.get("OPENSEARCH_ENABLED", ""),
            "PUBLIC_API_URL": os.environ.get("PUBLIC_API_URL", ""),
        },
    }

    if not health.get("dataset_loaded"):
        out["search_error"] = "Dataset not loaded — cannot run test search"
        out["results_count"] = 0
        return out

    t0 = time.perf_counter()
    try:
        svc = SearchService(settings)
        resp, timings = svc.unified_search_timed(query, top_k=top_k)
        out["normalized_query"] = resp.normalized_query
        out["results_count"] = len(resp.results)
        out["timings_ms"] = timings
        out["duration_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        out["results"] = [
            {
                "surah": r.surah,
                "ayah": r.ayah,
                "confidence": r.confidence,
            }
            for r in resp.results
        ]
        if resp.results:
            top = resp.results[0]
            out["top_match"] = {
                "surah": top.surah,
                "ayah": top.ayah,
                "confidence": top.confidence,
            }
    except Exception as e:
        out["search_error"] = str(e)
        out["traceback"] = traceback.format_exc()
        out["duration_ms"] = round((time.perf_counter() - t0) * 1000, 1)

    return out
