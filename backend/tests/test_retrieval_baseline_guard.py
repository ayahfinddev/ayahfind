"""
Ensure augmented retrieval never regresses baseline production behavior,
within QuranSearchEngine's own baseline/augmented modes.

NOTE: QuranSearchEngine (quran_search_engine.py) is NOT wired into any
live endpoint — POST /search/unified and /debug-search both use
SearchService (search_service.py) instead. This suite guards
QuranSearchEngine's internal retrieval_augmentation flag, which is
independent of the live retrieval path. For the live engine's
regression gate, see test_retrieval_regression.py.

For every benchmark case: if baseline finds the target, augmented must too.
If baseline has a confident primary (#1), augmented primary must match.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.quran_search_engine import CONFIDENCE_MEDIUM, QuranSearchEngine

CORPUS = ROOT / "data" / "processed" / "quran_search_corpus.json"
CASES_PATH = Path(__file__).resolve().parent / "retrieval_benchmark_cases.json"
LEGACY_CASES = Path(__file__).resolve().parent / "test_search.py"


def _load_benchmark_cases():
    return json.loads(CASES_PATH.read_text(encoding="utf-8"))["cases"]


@pytest.fixture(scope="module")
def corpus_ayahs():
    if not CORPUS.exists():
        pytest.skip("Corpus missing")
    return json.loads(CORPUS.read_text(encoding="utf-8"))["ayahs"]


@pytest.fixture(scope="module")
def baseline_engine(corpus_ayahs) -> QuranSearchEngine:
    return QuranSearchEngine(corpus_ayahs, retrieval_augmentation=False)


@pytest.fixture(scope="module")
def augmented_engine(corpus_ayahs) -> QuranSearchEngine:
    return QuranSearchEngine(corpus_ayahs, retrieval_augmentation=True)


def _refs(result, top_k: int):
    hits = list(result.primary) + list(result.weak_matches)
    return {(h.surah, h.ayah) for h in hits[:top_k]}


def _top_primary(result):
    if not result.primary:
        return None
    h = result.primary[0]
    return (h.surah, h.ayah)


@pytest.mark.parametrize("case", _load_benchmark_cases(), ids=lambda c: c["id"])
def test_augmented_preserves_baseline_hits(
    baseline_engine: QuranSearchEngine,
    augmented_engine: QuranSearchEngine,
    case: dict,
):
    top_k = int(case.get("top_k", 8))
    target = case.get("target")
    if target is None:
        return

    expected = (int(target[0]), int(target[1]))
    b = baseline_engine.search(case["query"], top_k=top_k)
    a = augmented_engine.search(case["query"], top_k=top_k)

    if expected in _refs(b, top_k):
        assert expected in _refs(a, top_k), (
            f"{case['id']}: baseline found {expected} but augmented missed it"
        )


@pytest.mark.parametrize("case", _load_benchmark_cases(), ids=lambda c: c["id"])
def test_augmented_preserves_baseline_primary_winner(
    baseline_engine: QuranSearchEngine,
    augmented_engine: QuranSearchEngine,
    case: dict,
):
    b = baseline_engine.search(case["query"], top_k=5)
    if not b.primary or b.primary[0].confidence < CONFIDENCE_MEDIUM:
        return
    b_top = _top_primary(b)
    a_top = _top_primary(augmented_engine.search(case["query"], top_k=5))
    assert a_top == b_top, (
        f"{case['id']}: baseline primary {b_top} became {a_top} after augmentation"
    )


def test_legacy_test_queries_baseline_guard(corpus_ayahs):
    """Queries from test_search.py must keep baseline-primary when confident."""
    queries = [
        ("ayahsabul insanu ayyutraka suda", (75, 36)),
        ("la yukallifullahu nafsan illa wusaha", (2, 286)),
        ("wa la taqrabu zina", (17, 32)),
        ("qul huwallahu ahad", (112, 1)),
        ("iyyaka nabudu wa iyyaka nastain", (1, 5)),
        ("rabbana atina fid dunya hasanah", (2, 201)),
    ]
    baseline = QuranSearchEngine(corpus_ayahs, retrieval_augmentation=False)
    augmented = QuranSearchEngine(corpus_ayahs, retrieval_augmentation=True)
    for q, expected in queries:
        b = baseline.search(q, top_k=5)
        a = augmented.search(q, top_k=5)
        assert expected in _refs(b, 5), f"baseline miss: {q}"
        assert expected in _refs(a, 5), f"augmented regression: {q}"
        if b.primary and b.primary[0].confidence >= CONFIDENCE_MEDIUM:
            assert _top_primary(a) == expected, f"primary winner changed: {q}"
