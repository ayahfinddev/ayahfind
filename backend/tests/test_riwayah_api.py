"""Route-level tests for the new additive riwayah endpoints in
backend/app/api/routes.py. Calls the endpoint functions directly (same
convention as test_tafsir_api.py) rather than spinning up the full ASGI
app, so these never depend on network access or the semantic/search
pipeline that is out of scope for this feature.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException, Response

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from app.api import routes as routes_module  # noqa: E402


def _run(coro):
    return asyncio.run(coro)


# ─── GET /riwayat ───────────────────────────────────────────────────────────


def test_list_riwayat_includes_hafs_enabled_and_default():
    resp = _run(routes_module.list_riwayat_endpoint())
    assert resp.default_riwayah_id == "hafs-an-asim"
    hafs = next(r for r in resp.riwayat if r.id == "hafs-an-asim")
    assert hafs.is_default is True
    assert hafs.is_enabled is True


def test_list_riwayat_includes_disabled_placeholders():
    resp = _run(routes_module.list_riwayat_endpoint())
    ids = {r.id for r in resp.riwayat}
    assert "warsh-an-nafi" in ids
    warsh = next(r for r in resp.riwayat if r.id == "warsh-an-nafi")
    assert warsh.is_enabled is False


# ─── GET /riwayat/{id}/ayah/{s}/{a} ─────────────────────────────────────────


def test_get_riwayah_ayah_hafs_available():
    resp = _run(routes_module.get_riwayah_ayah("hafs-an-asim", 1, 1, Response()))
    assert resp.available is True
    assert resp.text_ar


def test_get_riwayah_ayah_disabled_riwayah_returns_200_unavailable():
    response = Response()
    resp = _run(routes_module.get_riwayah_ayah("warsh-an-nafi", 1, 1, response))
    assert resp.available is False
    assert resp.unavailable_reason == "dataset_unavailable"
    assert response.headers.get("cache-control") == "no-store"


def test_get_riwayah_ayah_invalid_ayah_is_404():
    with pytest.raises(HTTPException) as exc_info:
        _run(routes_module.get_riwayah_ayah("hafs-an-asim", 1, 9999, Response()))
    assert exc_info.value.status_code == 404


# ─── GET /riwayat/{id}/reader/{surah} ───────────────────────────────────────


def test_riwayah_reader_hafs_full_surah_available():
    resp = _run(routes_module.riwayah_reader_surah("hafs-an-asim", 1, Response()))
    assert resp.available is True
    assert len(resp.ayahs) == 7  # Al-Fatiha
    assert all(a.available for a in resp.ayahs)


def test_riwayah_reader_disabled_riwayah_keeps_surah_ayah_shape():
    """Switching to an unavailable riwayah must not error — it returns the
    same surah with every ayah marked unavailable so the reader can show a
    clear blocked state without losing its place."""
    resp = _run(routes_module.riwayah_reader_surah("warsh-an-nafi", 1, Response()))
    assert resp.available is False
    assert len(resp.ayahs) == 7
    assert all(not a.available for a in resp.ayahs)


def test_riwayah_reader_invalid_surah_is_404():
    with pytest.raises(HTTPException) as exc_info:
        _run(routes_module.riwayah_reader_surah("hafs-an-asim", 999, Response()))
    assert exc_info.value.status_code == 404


# ─── GET /reading-variants/{s}/{a} ──────────────────────────────────────────


def test_reading_variants_hafs_only():
    resp = _run(routes_module.get_reading_variants(1, 1, Response()))
    assert resp.canonical_riwayah_id == "hafs-an-asim"
    assert resp.equivalent_riwayah_ids == ["hafs-an-asim"]
    assert resp.has_reading_variants is False


def test_reading_variants_invalid_ayah_is_404():
    with pytest.raises(HTTPException):
        _run(routes_module.get_reading_variants(1, 9999, Response()))


# ─── GET /riwayat/{id}/equivalent/{s}/{a} ───────────────────────────────────


def test_equivalent_readings_endpoint_hafs():
    resp = _run(routes_module.get_equivalent_readings_endpoint("hafs-an-asim", 1, 1))
    assert resp.displayed_riwayah_id == "hafs-an-asim"
    assert resp.comparison_complete is False


def test_equivalent_readings_endpoint_invalid_ayah_is_404():
    with pytest.raises(HTTPException):
        _run(routes_module.get_equivalent_readings_endpoint("hafs-an-asim", 1, 9999))


# ─── GET /riwayat/{id}/symbols ──────────────────────────────────────────────


def test_symbols_endpoint_hafs_available():
    resp = _run(routes_module.get_riwayah_symbols_endpoint("hafs-an-asim"))
    assert resp.available is True


def test_symbols_endpoint_disabled_riwayah_unavailable():
    resp = _run(routes_module.get_riwayah_symbols_endpoint("warsh-an-nafi"))
    assert resp.available is False


# ─── GET /riwayat/{id}/audio-availability ───────────────────────────────────


def test_audio_availability_endpoint_hafs():
    resp = _run(routes_module.get_audio_availability("hafs-an-asim", None))
    assert resp.available is True


def test_audio_availability_endpoint_disabled_riwayah():
    resp = _run(routes_module.get_audio_availability("warsh-an-nafi", "alafasy"))
    assert resp.available is False
    assert resp.reason == "dataset_unavailable"
