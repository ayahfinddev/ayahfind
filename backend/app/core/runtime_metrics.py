"""Lightweight process metrics for health/diagnostics."""

from __future__ import annotations

import time
from typing import Any

_START_TIME = time.time()


def uptime_seconds() -> float:
    return round(time.time() - _START_TIME, 1)


def memory_status() -> dict[str, Any]:
    try:
        import resource
        import sys

        usage = resource.getrusage(resource.RUSAGE_SELF)
        if sys.platform == "win32":
            rss_mb = round(usage.ru_maxrss / (1024 * 1024), 2)
        else:
            rss_mb = round(usage.ru_maxrss / 1024, 2)
        return {"rss_mb": rss_mb, "available": True}
    except Exception:
        pass
    try:
        import psutil

        proc = psutil.Process()
        mem = proc.memory_info()
        return {
            "rss_mb": round(mem.rss / (1024 * 1024), 2),
            "available": True,
        }
    except Exception:
        return {"rss_mb": None, "available": False}
