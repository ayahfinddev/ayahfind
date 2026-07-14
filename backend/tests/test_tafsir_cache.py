"""Tests for the bounded in-memory TTL cache used by the production tafsir
provider — cache hit/miss, expiry, and LRU-style bounding."""

from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from app.services.tafsir_cache import BoundedTTLCache  # noqa: E402


def test_cache_miss_returns_none():
    cache: BoundedTTLCache[str, str] = BoundedTTLCache(max_entries=10, ttl_seconds=60)
    assert cache.get("missing") is None


def test_cache_hit_returns_stored_value():
    cache: BoundedTTLCache[str, str] = BoundedTTLCache(max_entries=10, ttl_seconds=60)
    cache.set("k", "v")
    assert cache.get("k") == "v"


def test_cache_expiry():
    cache: BoundedTTLCache[str, str] = BoundedTTLCache(max_entries=10, ttl_seconds=0.05)
    cache.set("k", "v")
    assert cache.get("k") == "v"
    time.sleep(0.08)
    assert cache.get("k") is None


def test_expired_entry_is_evicted_from_underlying_storage():
    cache: BoundedTTLCache[str, str] = BoundedTTLCache(max_entries=10, ttl_seconds=0.05)
    cache.set("k", "v")
    time.sleep(0.08)
    cache.get("k")  # triggers lazy eviction
    assert len(cache) == 0


def test_bounded_eviction_drops_oldest_first():
    cache: BoundedTTLCache[str, int] = BoundedTTLCache(max_entries=3, ttl_seconds=60)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)
    cache.set("d", 4)  # exceeds max_entries=3, should evict "a"
    assert cache.get("a") is None
    assert cache.get("b") == 2
    assert cache.get("c") == 3
    assert cache.get("d") == 4
    assert len(cache) == 3


def test_rewriting_a_key_refreshes_its_recency():
    cache: BoundedTTLCache[str, int] = BoundedTTLCache(max_entries=2, ttl_seconds=60)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("a", 10)  # re-insert "a" — should now be the most recent, not "b"
    cache.set("c", 3)  # exceeds max_entries=2, should evict "b" (oldest), not "a"
    assert cache.get("a") == 10
    assert cache.get("b") is None
    assert cache.get("c") == 3
