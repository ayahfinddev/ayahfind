"""
Quran Foundation Content API client — OAuth2 client_credentials flow plus
the raw content requests. Backend-only: this module is never imported by
or exposed to the frontend (see src/lib/api.ts — the browser only ever
calls our own /api/v1/tafsir/* routes).

Endpoints (confirmed against Quran Foundation's public documentation,
2026-07-13 — see docs/TAFSIR_INGESTION.md):
  - Token:   POST https://oauth2.quran.foundation/oauth2/token   (production)
             POST https://prelive-oauth2.quran.foundation/oauth2/token (prelive)
             HTTP Basic auth (client_id:client_secret), grant_type=client_credentials,
             scope=content.
  - Content: https://apis.quran.foundation/content/api/v4       (production)
             https://apis-prelive.quran.foundation/content/api/v4 (prelive)
             headers: x-auth-token: <access_token>, x-client-id: <client_id>

QF_ENV selects production vs prelive host pairs — it is not a secret, just
an environment selector (like APP_ENV elsewhere), which is why only
QF_CLIENT_ID/QF_CLIENT_SECRET/QF_ENV need to be configured.

The single-verse tafsir endpoint's exact query-parameter contract could not
be confirmed with confidence from the docs during implementation, so this
client deliberately uses only the endpoint whose shape was verified
verbatim: GET /tafsirs/{resource_id}/by_chapter/{chapter_number}
(paginated, `{"tafsirs": [...], "pagination": {...}}`). The provider layer
(qf_tafsir_provider.py) fetches and caches a whole chapter at a time and
extracts the requested ayah from it.
"""

from __future__ import annotations

import logging
import time

import httpx

from app.core.config import Settings, get_settings

logger = logging.getLogger("ayahfind.tafsir.qf")

PRODUCTION_TOKEN_URL = "https://oauth2.quran.foundation/oauth2/token"
PRELIVE_TOKEN_URL = "https://prelive-oauth2.quran.foundation/oauth2/token"
PRODUCTION_API_BASE = "https://apis.quran.foundation/content/api/v4"
PRELIVE_API_BASE = "https://apis-prelive.quran.foundation/content/api/v4"

TOKEN_EXPIRY_BUFFER_SECONDS = 60.0


class QFCredentialsMissing(Exception):
    """QF_CLIENT_ID / QF_CLIENT_SECRET not configured."""


class QFUpstreamError(Exception):
    """Timeout, connection error, 429, or 5xx from Quran Foundation — transient,
    safe to treat as "try again shortly", never a reason to crash the reader."""


class QuranFoundationClient:
    """One instance per process (see qf_tafsir_provider.get_tafsir_store()).
    Holds a single shared httpx.AsyncClient and the current access token;
    both are safe to reuse across requests within one event loop."""

    def __init__(self, settings: Settings | None = None, *, http_client: httpx.AsyncClient | None = None) -> None:
        self._settings = settings or get_settings()
        self._http = http_client or httpx.AsyncClient(timeout=self._settings.qf_request_timeout_seconds)
        self._token: str | None = None
        self._token_expires_at: float = 0.0

    @property
    def token_url(self) -> str:
        return PRODUCTION_TOKEN_URL if self._settings.qf_env == "production" else PRELIVE_TOKEN_URL

    @property
    def api_base(self) -> str:
        return PRODUCTION_API_BASE if self._settings.qf_env == "production" else PRELIVE_API_BASE

    def has_credentials(self) -> bool:
        return bool(self._settings.qf_client_id and self._settings.qf_client_secret)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def _fetch_token(self) -> str:
        if not self.has_credentials():
            raise QFCredentialsMissing("QF_CLIENT_ID/QF_CLIENT_SECRET not configured")
        try:
            resp = await self._http.post(
                self.token_url,
                data={"grant_type": "client_credentials", "scope": "content"},
                auth=(self._settings.qf_client_id, self._settings.qf_client_secret),
            )
        except httpx.TimeoutException as e:
            raise QFUpstreamError(f"token request timed out: {e}") from e
        except httpx.HTTPError as e:
            raise QFUpstreamError(f"token request failed: {e}") from e

        if resp.status_code == 429 or resp.status_code >= 500:
            raise QFUpstreamError(f"token endpoint returned {resp.status_code}")
        if resp.status_code >= 400:
            # Don't leak provider error bodies (may include diagnostic detail
            # we shouldn't surface) — just the status, logged server-side.
            logger.error("qf_token_request_failed status=%s", resp.status_code)
            raise QFCredentialsMissing(f"token request rejected with status {resp.status_code}")

        payload = resp.json()
        token = payload.get("access_token")
        expires_in = payload.get("expires_in", 0)
        if not token:
            raise QFUpstreamError("token response missing access_token")

        self._token = token
        self._token_expires_at = time.monotonic() + max(float(expires_in) - TOKEN_EXPIRY_BUFFER_SECONDS, 0.0)
        logger.info("qf_token_refreshed expires_in=%s qf_env=%s", expires_in, self._settings.qf_env)
        return token

    async def get_token(self, *, force_refresh: bool = False) -> str:
        if not force_refresh and self._token and time.monotonic() < self._token_expires_at:
            return self._token
        return await self._fetch_token()

    async def request_json(self, method: str, path: str, *, params: dict | None = None) -> dict:
        """GET/POST a content-API path, handling one 401-triggered token
        refresh + retry. Raises QFCredentialsMissing / QFUpstreamError on
        failure — callers are expected to catch these and degrade
        gracefully, never let them crash the request."""
        token = await self.get_token()
        url = f"{self.api_base}{path}"
        headers = {"x-auth-token": token, "x-client-id": self._settings.qf_client_id}

        resp = await self._do_request(method, url, headers=headers, params=params)
        if resp.status_code == 401:
            token = await self.get_token(force_refresh=True)
            headers["x-auth-token"] = token
            resp = await self._do_request(method, url, headers=headers, params=params)

        if resp.status_code == 429 or resp.status_code >= 500:
            raise QFUpstreamError(f"{method} {path} -> {resp.status_code}")
        if resp.status_code >= 400:
            logger.error("qf_request_failed method=%s path=%s status=%s", method, path, resp.status_code)
            raise QFUpstreamError(f"{method} {path} -> {resp.status_code}")

        try:
            return resp.json()
        except ValueError as e:
            raise QFUpstreamError(f"non-JSON response from {path}: {e}") from e

    async def _do_request(self, method: str, url: str, *, headers: dict, params: dict | None) -> httpx.Response:
        try:
            return await self._http.request(method, url, headers=headers, params=params)
        except httpx.TimeoutException as e:
            raise QFUpstreamError(f"{method} {url} timed out: {e}") from e
        except httpx.HTTPError as e:
            raise QFUpstreamError(f"{method} {url} failed: {e}") from e
