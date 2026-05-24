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
    assert resp.results[0].text_ar_display
    assert "بسم" not in (resp.results[0].text_ar_display or "")[:24]


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


def test_theme_patience_anchor(svc: SearchService):
    resp = svc.unified_search("patience", top_k=5)
    assert resp.results
    refs = {(r.surah, r.ayah) for r in resp.results}
    assert (2, 153) in refs or (3, 200) in refs
    assert resp.intent_hint and "Patience" in resp.intent_hint


def test_theme_gratitude_anchor(svc: SearchService):
    resp = svc.unified_search("gratitude", top_k=8)
    assert resp.results
    refs = {(r.surah, r.ayah) for r in resp.results[:8]}
    assert (14, 7) in refs
    assert resp.intent_hint and "Gratitude" in resp.intent_hint


def test_theme_gratitude_not_punishment_top3(svc: SearchService):
    resp = svc.unified_search("gratitude", top_k=5)
    top3 = " ".join((r.translation_en or "").lower() for r in resp.results[:3])
    assert "ungrateful" not in top3
    assert "hell" not in top3


def test_english_paraphrase_9_93_not_lightning(svc: SearchService):
    q = "blame is only on those who seek exemption from you although"
    t0 = time.perf_counter()
    resp, timings = svc.unified_search_timed(q, top_k=5)
    elapsed = time.perf_counter() - t0
    assert elapsed < 2.5, f"English paraphrase search too slow: {elapsed:.2f}s"
    assert resp.results
    assert resp.results[0].surah == 9
    assert resp.results[0].ayah == 93
    assert resp.intent_hint == "english_lexical"
    assert timings.get("phonetic_skipped") == 1.0
    assert (2, 20) not in {(r.surah, r.ayah) for r in resp.results[:3]}
