"""Structured API error payloads (never crash the worker)."""

from __future__ import annotations

from typing import Any

from app.models.schemas import SearchResponse


def search_error_response(
    query: str,
    details: str,
    *,
    normalized_query: str | None = None,
    status_hint: str = "search_failed",
) -> dict[str, Any]:
    return {
        "error": status_hint,
        "details": details[:500],
        "query": query,
        "normalized_query": normalized_query,
        "results": [],
        "intent_hint": None,
        "message": "Search is temporarily unavailable. Please try again shortly.",
    }


def search_response_or_error(
    query: str,
    resp: SearchResponse | None,
    *,
    error: str | None = None,
    details: str | None = None,
) -> dict[str, Any]:
    if error:
        return search_error_response(query, details or error, status_hint=error)
    assert resp is not None
    return resp.model_dump()
