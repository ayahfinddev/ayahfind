"""Unified search latency and Arabic exact-match regression."""
from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.search_service import SearchService


@pytest.fixture(scope="module")
def svc() -> SearchService:
    s = SearchService()
    s._store.load()
    return s


def test_arabic_exact_fast_and_top(svc: SearchService):
    q = "الله ولي الذين امنوا"
    t0 = time.perf_counter()
    resp = svc.unified_search(q, top_k=5)
    elapsed = time.perf_counter() - t0
    assert elapsed < 1.5, f"Arabic search too slow: {elapsed:.2f}s"
    assert resp.results
    assert resp.results[0].surah == 2
    assert resp.results[0].ayah == 257
    assert len(resp.results) == 1, "Dominant exact match should return a single result"
    assert resp.results[0].confidence >= 0.90


def test_dominant_transliteration_high_confidence(svc: SearchService):
    resp = svc.unified_search("qul huwa allahu ahad", top_k=10)
    assert resp.results
    assert resp.results[0].surah == 112
    assert resp.results[0].ayah == 1
    assert resp.results[0].confidence >= 0.90
    assert len(resp.results) == 1


def test_repeated_phrase_keeps_multiple(svc: SearchService):
    resp = svc.unified_search("بسم الله الرحمن الرحيم", top_k=10)
    assert len(resp.results) >= 2
    assert all(r.confidence >= 0.85 for r in resp.results[:5])


def test_transliteration_under_budget(svc: SearchService):
    t0 = time.perf_counter()
    resp = svc.unified_search("qul huwa allahu ahad", top_k=5)
    elapsed = time.perf_counter() - t0
    assert elapsed < 3.0, f"Transliteration search too slow: {elapsed:.2f}s"
    assert resp.results


@pytest.mark.skipif(
    not (
        __import__("pathlib").Path(__file__).resolve().parents[2]
        / "vector_index"
        / "semantic.faiss"
    ).exists(),
    reason="Semantic FAISS index not built — theme ranking needs vector search",
)
def test_theme_patience_anchor(svc: SearchService):
    resp = svc.unified_search("patience", top_k=5)
    assert resp.results
    refs = {(r.surah, r.ayah) for r in resp.results}
    assert (2, 153) in refs or (3, 200) in refs
