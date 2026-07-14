"""Shared retrieval evaluation harness.

Runs benchmark cases against the *live* retrieval path (SearchService.
unified_search — the same code backing POST /search/unified) and computes
Recall@1/3/5, MRR, NDCG@5, and latency, overall and per query category.

This is the standard gate referenced in docs/ — every retrieval change
should be measured against it before/after, via scripts/eval_retrieval.py.

Cases support two ground-truth shapes:
  - "target": [surah, ayah]              — single accepted answer
  - "targets": [[surah, ayah], ...]       — any one of several accepted
    answers counts as a hit (used for verses that share a phrase, e.g.
    "each soul will taste death" appears near-verbatim in three places).
Cases with neither are judged only by "min_results" (existing legacy
cases that assert a minimum result count rather than a specific ayah).
"""

from __future__ import annotations

import json
import math
import statistics
from dataclasses import dataclass
from pathlib import Path
from typing import Any

CASES_PATH = Path(__file__).resolve().parent / "retrieval_benchmark_v2_cases.json"


def load_cases(path: Path = CASES_PATH) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))["cases"]


def case_targets(case: dict) -> set[tuple[int, int]] | None:
    if case.get("targets"):
        return {(int(s), int(a)) for s, a in case["targets"]}
    if case.get("target"):
        s, a = case["target"]
        return {(int(s), int(a))}
    return None


@dataclass
class CaseResult:
    id: str
    category: str
    query: str
    has_target: bool
    rank: int | None  # 1-indexed rank of first relevant hit among returned results; None = miss
    n_results: int
    latency_ms: float
    min_results_ok: bool = True  # only meaningful when has_target is False


def _rank_of_hit(refs: list[tuple[int, int]], targets: set[tuple[int, int]]) -> int | None:
    for i, r in enumerate(refs, start=1):
        if r in targets:
            return i
    return None


def run_case(search_service: Any, case: dict, retrieve_k: int = 10) -> CaseResult:
    """Runs one case through SearchService.unified_search (the live engine)."""
    import time

    top_k = max(int(case.get("top_k", 8)), retrieve_k)
    t0 = time.perf_counter()
    resp = search_service.unified_search(case["query"], top_k=top_k)
    latency_ms = (time.perf_counter() - t0) * 1000
    refs = [(r.surah, r.ayah) for r in resp.results]
    targets = case_targets(case)
    if targets is None:
        return CaseResult(
            id=case["id"], category=case.get("category", "uncategorized"), query=case["query"],
            has_target=False, rank=None, n_results=len(resp.results), latency_ms=latency_ms,
            min_results_ok=len(resp.results) >= int(case.get("min_results", 1)),
        )
    rank = _rank_of_hit(refs, targets)
    return CaseResult(
        id=case["id"], category=case.get("category", "uncategorized"), query=case["query"],
        has_target=True, rank=rank, n_results=len(resp.results), latency_ms=latency_ms,
    )


def run_benchmark(search_service: Any, cases: list[dict] | None = None, retrieve_k: int = 10) -> dict:
    cases = cases if cases is not None else load_cases()
    results = [run_case(search_service, c, retrieve_k=retrieve_k) for c in cases]
    by_category: dict[str, list[CaseResult]] = {}
    for r in results:
        by_category.setdefault(r.category, []).append(r)
    return {
        "overall": summarize(results),
        "by_category": {cat: summarize(rs) for cat, rs in sorted(by_category.items())},
        "results": [
            {
                "id": r.id, "category": r.category, "query": r.query, "has_target": r.has_target,
                "rank": r.rank, "n_results": r.n_results, "latency_ms": round(r.latency_ms, 1),
                "min_results_ok": r.min_results_ok,
            }
            for r in results
        ],
    }


def _dcg_at(rank: int | None, k: int) -> float:
    if rank is None or rank > k:
        return 0.0
    return 1.0 / math.log2(rank + 1)


def _percentile(values: list[float], pct: float) -> float | None:
    if not values:
        return None
    s = sorted(values)
    idx = max(0, min(len(s) - 1, math.ceil(pct * len(s)) - 1))
    return round(s[idx], 1)


def summarize(results: list[CaseResult]) -> dict:
    targeted = [r for r in results if r.has_target]
    untargeted = [r for r in results if not r.has_target]
    n = len(targeted)

    def recall_at(k: int) -> float | None:
        if n == 0:
            return None
        return round(sum(1 for r in targeted if r.rank is not None and r.rank <= k) / n, 4)

    mrr = round(sum(1.0 / r.rank for r in targeted if r.rank is not None) / n, 4) if n else None
    ndcg5 = round(sum(_dcg_at(r.rank, 5) for r in targeted) / n, 4) if n else None
    lat = [r.latency_ms for r in results]

    return {
        "n_cases": len(results),
        "n_targeted": n,
        "n_untargeted": len(untargeted),
        "recall_at_1": recall_at(1),
        "recall_at_3": recall_at(3),
        "recall_at_5": recall_at(5),
        "mrr": mrr,
        "ndcg_at_5": ndcg5,
        "min_results_pass_rate": (
            round(sum(1 for r in untargeted if r.min_results_ok) / len(untargeted), 4)
            if untargeted else None
        ),
        "latency_p50_ms": _percentile(lat, 0.50),
        "latency_p95_ms": _percentile(lat, 0.95),
        "misses": sorted(r.id for r in targeted if r.rank is None),
    }


def report_text(report: dict) -> str:
    lines: list[str] = []
    o = report["overall"]
    lines.append(
        f"OVERALL  n={o['n_cases']} (targeted={o['n_targeted']}, untargeted={o['n_untargeted']})  "
        f"R@1={o['recall_at_1']} R@3={o['recall_at_3']} R@5={o['recall_at_5']} "
        f"MRR={o['mrr']} NDCG@5={o['ndcg_at_5']}  "
        f"lat_p50={o['latency_p50_ms']}ms lat_p95={o['latency_p95_ms']}ms"
    )
    lines.append("")
    for cat, s in report["by_category"].items():
        lines.append(
            f"  {cat:<22} n={s['n_cases']:<4} R@1={s['recall_at_1']} R@3={s['recall_at_3']} "
            f"R@5={s['recall_at_5']} MRR={s['mrr']} NDCG@5={s['ndcg_at_5']} "
            f"lat_p50={s['latency_p50_ms']}ms"
        )
    if o["misses"]:
        lines.append("")
        lines.append(f"MISSES ({len(o['misses'])}): {', '.join(o['misses'])}")
    return "\n".join(lines)
