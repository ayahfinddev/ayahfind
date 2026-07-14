"""Tests for the production (Quran Foundation-backed) tafsir provider:
grouped verse ranges, per-chapter caching (hit/miss/expiry), missing
credentials, resource-ID catalogue mismatch, and upstream
timeout/429/5xx degrading gracefully instead of raising. All network
calls are mocked via httpx.MockTransport.
"""

from __future__ import annotations

import asyncio
import sys
import time
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import Settings  # noqa: E402
from app.services.qf_client import QuranFoundationClient  # noqa: E402
from app.services.qf_tafsir_provider import QFTafsirProvider, group_chapter_rows  # noqa: E402


def _run(coro):
    return asyncio.run(coro)


GOOD_CATALOGUE = {
    "tafsirs": [
        {"id": 169, "language_name": "english", "name": "Tafsir Ibn Kathir (Abridged)"},
        {"id": 91, "language_name": "arabic", "name": "Tafsir Al-Sa'di"},
    ]
}

BAD_CATALOGUE = {
    "tafsirs": [
        {"id": 169, "language_name": "urdu", "name": "Something Else Entirely"},
        {"id": 91, "language_name": "arabic", "name": "Tafsir Al-Sa'di"},
    ]
}


def _chapter_payload(rows: list[dict]) -> dict:
    return {
        "tafsirs": rows,
        "pagination": {
            "per_page": max(len(rows), 1),
            "current_page": 1,
            "next_page": None,
            "total_pages": 1,
            "total_records": len(rows),
        },
    }


def _resource_id_from_path(path: str) -> int:
    parts = path.split("/")
    return int(parts[parts.index("tafsirs") + 1])


def _make_provider(handler, *, tafsir_enabled: bool = True, ttl_seconds: float = 6 * 24 * 3600) -> QFTafsirProvider:
    settings = Settings(
        tafsir_enabled=tafsir_enabled,
        environment="production",
        qf_client_id="cid",
        qf_client_secret="csecret",
        tafsir_cache_ttl_seconds=ttl_seconds,
    )
    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    client = QuranFoundationClient(settings, http_client=http_client)
    return QFTafsirProvider(settings, client=client)


def _standard_handler(chapter_rows_by_resource: dict[int, list[dict]], request_log: list | None = None):
    def handler(request: httpx.Request) -> httpx.Response:
        if request_log is not None:
            request_log.append(request)
        if request.url.path == "/oauth2/token":
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        if request.url.path == "/content/api/v4/resources/tafsirs":
            return httpx.Response(200, json=GOOD_CATALOGUE)
        resource_id = _resource_id_from_path(request.url.path)
        return httpx.Response(200, json=_chapter_payload(chapter_rows_by_resource.get(resource_id, [])))

    return handler


# ─── Grouped entries (pure function) ─────────────────────────────────────


def test_group_chapter_rows_collapses_consecutive_identical_text():
    rows = [
        {"verse_key": "2:1", "text": "<p>Same</p>"},
        {"verse_key": "2:2", "text": "<p>Same</p>"},
        {"verse_key": "2:3", "text": "<p>Same</p>"},
        {"verse_key": "2:4", "text": "<p>Different</p>"},
    ]
    grouped = group_chapter_rows(rows)
    assert len(grouped) == 2
    assert grouped[0].verse_start_ayah == 1 and grouped[0].verse_end_ayah == 3
    assert grouped[1].verse_start_ayah == 4 and grouped[1].verse_end_ayah == 4


def test_group_chapter_rows_keeps_different_text_distinct():
    rows = [{"verse_key": "2:1", "text": "<p>A</p>"}, {"verse_key": "2:2", "text": "<p>B</p>"}]
    grouped = group_chapter_rows(rows)
    assert len(grouped) == 2


def test_group_chapter_rows_sanitizes_unsafe_markup():
    rows = [{"verse_key": "1:1", "text": "<script>alert(1)</script><p>Safe</p>"}]
    grouped = group_chapter_rows(rows)
    assert "<script" not in grouped[0].text_html
    assert "Safe" in grouped[0].text_html


# ─── End-to-end lookup: grouped ranges preserved via the provider ────────


def test_lookup_preserves_grouped_ranges():
    rows_169 = [
        {"verse_key": "2:1", "text": "<p>Group</p>"},
        {"verse_key": "2:2", "text": "<p>Group</p>"},
        {"verse_key": "2:3", "text": "<p>Group</p>"},
    ]
    rows_91 = [{"verse_key": "2:3", "text": "<p>سعدي</p>"}]
    provider = _make_provider(_standard_handler({169: rows_169, 91: rows_91}))

    results = _run(provider.lookup("2:3"))
    ik = next(r for r in results if r.source_slug == "ibn_kathir_en")
    assert ik.verse_start == "2:1" and ik.verse_end == "2:3"
    sa = next(r for r in results if r.source_slug == "saadi_ar")
    assert sa.verse_start == sa.verse_end == "2:3"


# ─── Cache hit/miss + expiry ──────────────────────────────────────────────


def test_lookup_caches_chapter_and_avoids_refetch():
    request_log: list = []
    rows = [{"verse_key": "1:1", "text": "<p>x</p>"}]
    provider = _make_provider(_standard_handler({169: rows, 91: rows}, request_log))

    _run(provider.lookup("1:1"))
    n_after_first = len(request_log)
    _run(provider.lookup("1:1"))  # same chapter — should be a cache + validation hit
    assert len(request_log) == n_after_first


def test_lookup_refetches_after_cache_expiry():
    call_count = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/oauth2/token":
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        if request.url.path == "/content/api/v4/resources/tafsirs":
            return httpx.Response(200, json=GOOD_CATALOGUE)
        call_count["n"] += 1
        return httpx.Response(
            200, json=_chapter_payload([{"verse_key": "1:1", "text": f"<p>v{call_count['n']}</p>"}])
        )

    provider = _make_provider(handler, ttl_seconds=0.05)
    r1 = _run(provider.lookup("1:1"))
    time.sleep(0.08)
    r2 = _run(provider.lookup("1:1"))
    assert r1[0].text_html != r2[0].text_html


# ─── Missing credentials ──────────────────────────────────────────────────


def test_missing_credentials_makes_provider_unavailable():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})

    settings = Settings(tafsir_enabled=True, environment="production", qf_client_id="", qf_client_secret="")
    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    client = QuranFoundationClient(settings, http_client=http_client)
    provider = QFTafsirProvider(settings, client=client)

    assert _run(provider.available()) is False
    assert _run(provider.lookup("1:1")) == []


def test_disabled_feature_makes_no_network_calls():
    calls: list = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={})

    provider = _make_provider(handler, tafsir_enabled=False)
    assert _run(provider.available()) is False
    assert calls == []


# ─── Resource-ID mismatch ─────────────────────────────────────────────────


def test_resource_mismatch_makes_provider_unavailable():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/oauth2/token":
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        if request.url.path == "/content/api/v4/resources/tafsirs":
            return httpx.Response(200, json=BAD_CATALOGUE)
        return httpx.Response(200, json=_chapter_payload([]))

    provider = _make_provider(handler)
    assert _run(provider.available()) is False
    assert provider.content_environment is None


# ─── Upstream failures during lookup degrade gracefully ──────────────────


def test_upstream_timeout_during_lookup_degrades_gracefully():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/oauth2/token":
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        if request.url.path == "/content/api/v4/resources/tafsirs":
            return httpx.Response(200, json=GOOD_CATALOGUE)
        raise httpx.TimeoutException("boom", request=request)

    provider = _make_provider(handler)
    assert _run(provider.lookup("1:1")) == []


@pytest.mark.parametrize("status", [429, 500])
def test_upstream_error_status_during_lookup_degrades_gracefully(status):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/oauth2/token":
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        if request.url.path == "/content/api/v4/resources/tafsirs":
            return httpx.Response(200, json=GOOD_CATALOGUE)
        return httpx.Response(status)

    provider = _make_provider(handler)
    assert _run(provider.lookup("1:1")) == []
