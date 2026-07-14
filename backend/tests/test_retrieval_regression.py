"""Retrieval regression guard against the live SearchService engine.

Unlike test_retrieval_benchmark.py / test_retrieval_baseline_guard.py
(which validate QuranSearchEngine — a class not wired to any live
endpoint, see quran_search_engine.py), this suite exercises
SearchService.unified_search, the actual code behind POST /search/unified.

The v2 benchmark (retrieval_benchmark_v2_cases.json) intentionally
includes hard, vague, and broken queries that the engine does not yet
handle well — see backend/tests/retrieval_baseline_snapshot.json for the
captured baseline (overall Recall@1 ~0.44 as of the snapshot). This suite
does not demand 100% recall; it demands that recall never gets *worse*
than the snapshot as retrieval changes land, and reports overall metrics
so every change's impact is visible. Refresh the snapshot deliberately
with `python scripts/eval_retrieval.py --save-baseline` after a change
that's expected to improve recall.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.search_service import SearchService
from retrieval_eval_lib import CASES_PATH, load_cases, run_case, summarize

CORPUS = ROOT / "data" / "processed" / "ayahs_processed.json"
BASELINE_PATH = Path(__file__).resolve().parent / "retrieval_baseline_snapshot.json"


@pytest.fixture(scope="module")
def svc() -> SearchService:
    if not CORPUS.exists():
        pytest.skip("Corpus missing")
    s = SearchService()
    s._store.load()
    return s


@pytest.fixture(scope="module")
def baseline() -> dict:
    if not BASELINE_PATH.exists():
        pytest.skip("No baseline snapshot yet — run scripts/eval_retrieval.py --save-baseline")
    return json.loads(BASELINE_PATH.read_text(encoding="utf-8"))


def test_no_per_case_regression(svc: SearchService, baseline: dict):
    """No case that used to find its target should stop finding it, and no
    case should rank its target *worse* than the baseline captured it."""
    regressions = []
    for case in load_cases():
        base_rank = baseline["by_case_rank"].get(case["id"])
        if base_rank is None:
            continue  # wasn't a hit in the baseline either — nothing to protect
        result = run_case(svc, case, retrieve_k=10)
        if result.rank is None:
            regressions.append(f"{case['id']}: was rank {base_rank}, now missing")
        elif result.rank > base_rank:
            regressions.append(f"{case['id']}: was rank {base_rank}, now rank {result.rank}")
    assert not regressions, "Retrieval regressed vs baseline:\n" + "\n".join(regressions)


def test_no_overall_recall_regression(svc: SearchService, baseline: dict):
    cases = load_cases()
    results = [run_case(svc, c, retrieve_k=10) for c in cases]
    current = summarize(results)
    base = baseline["overall"]
    for metric in ("recall_at_1", "recall_at_3", "recall_at_5", "mrr", "ndcg_at_5"):
        assert current[metric] >= base[metric] - 1e-6, (
            f"{metric} regressed: baseline={base[metric]} current={current[metric]}"
        )
