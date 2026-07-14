"""Tests for the Quran Foundation OAuth2 client_credentials client:
token retrieval, reuse, expiry, 401-triggered single refresh+retry, missing
credentials, and upstream timeout/429/5xx handling. All network calls are
mocked via httpx.MockTransport — nothing here touches the real network.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import httpx
import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from app.core.config import Settings  # noqa: E402
from app.services.qf_client import QFCredentialsMissing, QFUpstreamError, QuranFoundationClient  # noqa: E402


def _run(coro):
    return asyncio.run(coro)


def _make_client(handler, *, client_id="cid", client_secret="csecret") -> QuranFoundationClient:
    settings = Settings(qf_client_id=client_id, qf_client_secret=client_secret, qf_env="production")
    http_client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return QuranFoundationClient(settings, http_client=http_client)


# ─── Token retrieval ──────────────────────────────────────────────────────


def test_token_retrieval_uses_basic_auth_and_client_credentials_grant():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        assert request.url.path == "/oauth2/token"
        assert request.headers["authorization"].startswith("Basic ")
        body = request.read().decode()
        assert "grant_type=client_credentials" in body
        assert "scope=content" in body
        return httpx.Response(200, json={"access_token": "tok-1", "expires_in": 3600})

    client = _make_client(handler)
    token = _run(client.get_token())
    assert token == "tok-1"
    assert len(calls) == 1


# ─── Token reuse ──────────────────────────────────────────────────────────


def test_token_reused_within_expiry():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"access_token": f"tok-{len(calls)}", "expires_in": 3600})

    client = _make_client(handler)
    t1 = _run(client.get_token())
    t2 = _run(client.get_token())
    assert t1 == t2 == "tok-1"
    assert len(calls) == 1


# ─── Token expiry ─────────────────────────────────────────────────────────


def test_token_refetched_after_expiry():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        # expires_in=0 (minus the buffer, clamped to 0) puts expiry at "now" —
        # any time elapsed before the next call makes it expired.
        return httpx.Response(200, json={"access_token": f"tok-{len(calls)}", "expires_in": 0})

    client = _make_client(handler)
    t1 = _run(client.get_token())
    t2 = _run(client.get_token())
    assert t1 == "tok-1"
    assert t2 == "tok-2"
    assert len(calls) == 2


# ─── 401 refresh + one retry ──────────────────────────────────────────────


def test_401_triggers_one_token_refresh_and_one_retry():
    token_calls = []
    content_calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/oauth2/token":
            token_calls.append(request)
            return httpx.Response(200, json={"access_token": f"tok-{len(token_calls)}", "expires_in": 3600})
        content_calls.append(request)
        if len(content_calls) == 1:
            return httpx.Response(401)
        return httpx.Response(200, json={"ok": True})

    client = _make_client(handler)
    result = _run(client.request_json("GET", "/some/path"))
    assert result == {"ok": True}
    assert len(content_calls) == 2
    assert len(token_calls) == 2  # initial fetch + the 401-triggered refresh


def test_401_twice_raises_after_exactly_one_retry():
    content_calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/oauth2/token":
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        content_calls.append(request)
        return httpx.Response(401)

    client = _make_client(handler)
    with pytest.raises(QFUpstreamError):
        _run(client.request_json("GET", "/some/path"))
    assert len(content_calls) == 2  # original attempt + exactly one retry, no more


# ─── Missing credentials ──────────────────────────────────────────────────


def test_missing_credentials_raises_without_any_network_call():
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})

    client = _make_client(handler, client_id="", client_secret="")
    with pytest.raises(QFCredentialsMissing):
        _run(client.get_token())
    assert calls == []


# ─── Upstream failures ─────────────────────────────────────────────────────


def test_token_endpoint_5xx_raises_qf_upstream_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500)

    client = _make_client(handler)
    with pytest.raises(QFUpstreamError):
        _run(client.get_token())


def test_upstream_timeout_raises_qf_upstream_error():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/oauth2/token":
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        raise httpx.TimeoutException("boom", request=request)

    client = _make_client(handler)
    with pytest.raises(QFUpstreamError):
        _run(client.request_json("GET", "/some/path"))


@pytest.mark.parametrize("status", [429, 500, 503])
def test_upstream_429_and_5xx_raise_qf_upstream_error(status):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/oauth2/token":
            return httpx.Response(200, json={"access_token": "tok", "expires_in": 3600})
        return httpx.Response(status)

    client = _make_client(handler)
    with pytest.raises(QFUpstreamError):
        _run(client.request_json("GET", "/some/path"))
