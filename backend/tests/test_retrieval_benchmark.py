"""Retrieval stability benchmark for QuranSearchEngine.

NOTE: QuranSearchEngine (quran_search_engine.py) is NOT wired into any
live endpoint — POST /search/unified and /debug-search both use
SearchService (search_service.py) instead. This suite is kept because
QuranSearchEngine is still real, working code, but it is no longer the
retrieval regression gate. For the live engine, see
test_retrieval_regression.py, which runs the same style of benchmark
(retrieval_benchmark_v2_cases.json) against SearchService.unified_search.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.quran_search_engine import QuranSearchEngine

CORPUS = ROOT / "data" / "processed" / "quran_search_corpus.json"
CASES_PATH = Path(__file__).resolve().parent / "retrieval_benchmark_cases.json"


def _load_cases():
    return json.loads(CASES_PATH.read_text(encoding="utf-8"))["cases"]


@pytest.fixture(scope="module")
def engine() -> QuranSearchEngine:
    if not CORPUS.exists():
        pytest.skip("Corpus missing")
    data = json.loads(CORPUS.read_text(encoding="utf-8"))
    return QuranSearchEngine(data["ayahs"])


def _refs(result, top_k: int):
    hits = list(result.primary) + list(result.weak_matches)
    return {(h.surah, h.ayah) for h in hits[:top_k]}


@pytest.mark.parametrize("case", _load_cases(), ids=lambda c: c["id"])
def test_benchmark_case(engine: QuranSearchEngine, case: dict):
    top_k = int(case.get("top_k", 8))
    result = engine.search(case["query"], top_k=top_k, debug=True)
    refs = _refs(result, top_k)
    target = case.get("target")
    if target is None:
        assert len(result.primary) + len(result.weak_matches) >= int(case.get("min_results", 2))
        return
    expected = (int(target[0]), int(target[1]))
    assert expected in refs


def test_benchmark_top3_guard(engine: QuranSearchEngine):
    failures = []
    for case in _load_cases():
        if case.get("target") is None:
            continue
        result = engine.search(case["query"], top_k=3)
        if (int(case["target"][0]), int(case["target"][1])) not in _refs(result, 3):
            failures.append(case["id"])
    assert not failures
