"""
Generic bounded in-memory TTL cache. Used by the production tafsir provider
(qf_tafsir_provider.py) to cache per-chapter tafsir responses for under
Quran Foundation's 7-day caching cap — no persistent disk involved, so this
resets on every deploy/restart (Render's free plan has no persistent disk,
which is exactly why this is in-memory rather than sqlite-on-disk).

LRU-bounded (oldest-inserted evicted first once max_entries is exceeded) as
a defensive cap, not because it's expected to fill: with only 114 surahs x
2 approved sources, there are at most ~228 possible keys.
"""

from __future__ import annotations

import time
from collections import OrderedDict
from dataclasses import dataclass
from typing import Generic, TypeVar

K = TypeVar("K")
V = TypeVar("V")


@dataclass
class _Entry(Generic[V]):
    value: V
    expires_at: float


class BoundedTTLCache(Generic[K, V]):
    def __init__(self, *, max_entries: int, ttl_seconds: float) -> None:
        self._max_entries = max_entries
        self._ttl_seconds = ttl_seconds
        self._data: "OrderedDict[K, _Entry[V]]" = OrderedDict()

    def get(self, key: K) -> V | None:
        entry = self._data.get(key)
        if entry is None:
            return None
        if entry.expires_at <= time.monotonic():
            del self._data[key]
            return None
        return entry.value

    def set(self, key: K, value: V) -> None:
        self._data.pop(key, None)
        self._data[key] = _Entry(value=value, expires_at=time.monotonic() + self._ttl_seconds)
        while len(self._data) > self._max_entries:
            self._data.popitem(last=False)

    def __len__(self) -> int:
        return len(self._data)

    def clear(self) -> None:
        self._data.clear()
