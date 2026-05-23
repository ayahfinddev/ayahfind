"""Local retrieval latency benchmark (run before deploy)."""
from __future__ import annotations

import json
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.core.build_info import RETRIEVAL_VERSION
from app.services.search_service import SearchService

CASES = [
    ("translit_112_1", "qul huwa allahu ahad"),
    ("arabic_56_75_plural", "\u0641\u0644\u0627 \u0627\u0642\u0633\u0645 \u0628\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u0646\u062c\u0648\u0645"),
    ("arabic_56_75_exact", "\u0641\u0644\u0627 \u0627\u0642\u0633\u0645 \u0628\u0645\u0648\u0642\u0639 \u0627\u0644\u0646\u062c\u0648\u0645"),
    ("arabic_2_257", "\u0627\u0644\u0644\u0647 \u0648\u0644\u064a \u0627\u0644\u0630\u064a\u0646 \u0627\u0645\u0646\u0648\u0627"),
    ("basmala", "\u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062d\u0645\u0646 \u0627\u0644\u0631\u062d\u064a\u0645"),
]


def main() -> int:
    svc = SearchService()
    svc._store.load()
    print(f"retrieval_version={RETRIEVAL_VERSION}")
    print(f"ayahs={len(svc._store.ayahs)}")
    budgets = {"lexical_ms": 800, "total_ms": 1500}
    failed = 0

    for name, query in CASES:
        times: list[float] = []
        last_timings: dict = {}
        top = None
        for _ in range(3):
            t0 = time.perf_counter()
            resp, timings = svc.unified_search_timed(query, top_k=5)
            elapsed = (time.perf_counter() - t0) * 1000
            times.append(elapsed)
            last_timings = timings
            if resp.results:
                top = (resp.results[0].surah, resp.results[0].ayah)

        med = statistics.median(times)
        print(
            f"\n{name}: median={med:.0f}ms top={top} n={len(resp.results)} "
            f"path={last_timings.get('lexical_path')} "
            f"scanned={last_timings.get('lexical_rows_scanned')} "
            f"aug={last_timings.get('lexical_rows_augmented')}"
        )
        if med > budgets["total_ms"]:
            print(f"  FAIL total > {budgets['total_ms']}ms")
            failed += 1
        lex_ms = float(last_timings.get("lexical_ms") or 0)
        if lex_ms > budgets["lexical_ms"]:
            print(f"  WARN lexical_ms={lex_ms} > {budgets['lexical_ms']}ms")

    out = ROOT / "benchmark_retrieval_latest.json"
    out.write_text(
        json.dumps({"version": RETRIEVAL_VERSION, "budgets_ms": budgets}, indent=2),
        encoding="utf-8",
    )
    print(f"\nWrote {out}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
