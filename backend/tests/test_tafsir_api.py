"""Tests for the tafsir service layer and the /api/v1/tafsir/{surah}/{ayah}
route: valid ayah, grouped tafsir, missing tafsir, invalid ayah, disabled
feature, and genuine db corruption (must surface as an error, not a silent
empty result).

Builds an isolated tafsir.db from the same fixtures as
test_tafsir_ingestion.py — independent of whatever data/tafsir.db currently
contains on disk.
"""

from __future__ import annotations

import asyncio
import sqlite3
import sys
from pathlib import Path

import pytest
from fastapi import HTTPException, Response

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from data_pipeline.ingest_tafsir import build_database, group_rows_into_entries, load_fixture_source, verify_and_swap  # noqa: E402
from data_pipeline.tafsir_schema import CONTENT_ENV_FIXTURE, CONTENT_ENV_PRODUCTION  # noqa: E402

from app.api import routes as routes_module  # noqa: E402
from app.core.config import Settings  # noqa: E402
from app.services.tafsir_store import TafsirCorrupted, TafsirStore  # noqa: E402

FIXTURES = ROOT / "data_pipeline" / "fixtures" / "tafsir_sample.json"


def _build_db(tmp_path: Path, *, content_environment: str) -> Path:
    sources, rows, retrieved_at = load_fixture_source(FIXTURES)
    grouped = group_rows_into_entries(rows)
    final_path = tmp_path / "tafsir.db"
    tmp_db = final_path.with_suffix(".tmp")
    build_database(tmp_db, sources, grouped, retrieved_at, content_environment=content_environment)
    verify_and_swap(tmp_db, final_path)
    return final_path


@pytest.fixture()
def tafsir_db(tmp_path) -> Path:
    return _build_db(tmp_path, content_environment=CONTENT_ENV_FIXTURE)


@pytest.fixture()
def production_tafsir_db(tmp_path) -> Path:
    """Same fixture content, tagged as if it were verified production data —
    used only to test the caching/availability *logic*, not to claim the
    fixture text itself is real production content."""
    return _build_db(tmp_path, content_environment=CONTENT_ENV_PRODUCTION)


@pytest.fixture()
def enabled_store(tafsir_db) -> TafsirStore:
    settings = Settings(tafsir_enabled=True, tafsir_db_path=tafsir_db, environment="development")
    return TafsirStore(settings=settings)


# ─── Service layer ─────────────────────────────────────────────────────


def test_lookup_single_ayah_returns_both_sources(enabled_store):
    rows = enabled_store.lookup("1:1")
    slugs = {r.source_slug for r in rows}
    assert slugs == {"ibn_kathir_en", "saadi_ar"}
    for r in rows:
        assert r.verse_start == r.verse_end == "1:1"


def test_lookup_grouped_ayah_returns_full_range(enabled_store):
    rows = enabled_store.lookup("2:3")
    ik = next(r for r in rows if r.source_slug == "ibn_kathir_en")
    assert ik.verse_start == "2:1"
    assert ik.verse_end == "2:5"


def test_lookup_missing_ayah_returns_empty(enabled_store):
    assert enabled_store.lookup("2:6") == []


def test_lookup_disabled_returns_empty_even_with_data_present(tafsir_db):
    disabled = TafsirStore(settings=Settings(tafsir_enabled=False, tafsir_db_path=tafsir_db))
    assert disabled.lookup("1:1") == []
    assert disabled.available() is False


def test_lookup_missing_db_file_is_unavailable_not_error(tmp_path):
    store = TafsirStore(settings=Settings(tafsir_enabled=True, tafsir_db_path=tmp_path / "nope.db"))
    assert store.available() is False
    assert store.lookup("1:1") == []


def test_lookup_corrupted_db_raises_not_silently_empty(tmp_path):
    bad_path = tmp_path / "corrupt.db"
    conn = sqlite3.connect(str(bad_path))
    conn.execute("CREATE TABLE unrelated (id INTEGER)")  # no schema_meta table at all
    conn.commit()
    conn.close()

    store = TafsirStore(settings=Settings(tafsir_enabled=True, tafsir_db_path=bad_path))
    with pytest.raises(TafsirCorrupted):
        store.lookup("1:1")


def test_unapproved_source_makes_store_unavailable(tmp_path):
    """A tafsir.db that somehow contains an extra unapproved collection must
    not be served — this is treated as unavailable rather than mixing in
    unapproved content."""
    sources, rows, retrieved_at = load_fixture_source(FIXTURES)
    grouped = group_rows_into_entries(rows)
    final_path = tmp_path / "tafsir.db"
    tmp_db = final_path.with_suffix(".tmp")
    build_database(tmp_db, sources, grouped, retrieved_at, content_environment=CONTENT_ENV_FIXTURE)
    # Bypass verify_and_swap (which would reject this) to simulate a db that
    # somehow got past ingestion-time checks — the runtime sanity check is a
    # second line of defense, not the only one.
    conn = sqlite3.connect(str(tmp_db))
    conn.execute(
        """
        INSERT INTO tafsir_sources
            (slug, upstream_resource_id, title, author, language, provider,
             attribution, license_note, retrieved_at, content_version)
        VALUES ('rogue_source', 999, 'Rogue', 'Nobody', 'en', 'x', 'x', 'x', 'now', NULL)
        """
    )
    conn.commit()
    conn.close()
    tmp_db.rename(final_path)

    store = TafsirStore(settings=Settings(tafsir_enabled=True, tafsir_db_path=final_path))
    assert store.available() is False
    assert store.lookup("1:1") == []


# ─── Route layer ────────────────────────────────────────────────────────


def _run(coro):
    return asyncio.run(coro)


def test_route_valid_ayah(monkeypatch, enabled_store):
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: enabled_store)
    resp = _run(routes_module.get_tafsir(1, 1, Response()))
    assert resp.available is True
    assert resp.verse_key == "1:1"
    assert {e.source_slug for e in resp.entries} == {"ibn_kathir_en", "saadi_ar"}
    assert all(e.text and "<" not in e.text for e in resp.entries)  # plain text, no HTML


def test_route_grouped_ayah(monkeypatch, enabled_store):
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: enabled_store)
    resp = _run(routes_module.get_tafsir(2, 3, Response()))
    assert resp.available is True
    ik = next(e for e in resp.entries if e.source_slug == "ibn_kathir_en")
    assert ik.verse_start == "2:1" and ik.verse_end == "2:5"


def test_route_missing_tafsir_is_graceful(monkeypatch, enabled_store):
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: enabled_store)
    resp = _run(routes_module.get_tafsir(2, 6, Response()))
    assert resp.available is False
    assert resp.entries == []
    assert resp.message


def test_route_invalid_ayah_is_404(monkeypatch, enabled_store):
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: enabled_store)
    with pytest.raises(HTTPException) as exc_info:
        _run(routes_module.get_tafsir(2, 999, Response()))
    assert exc_info.value.status_code == 404


def test_route_invalid_surah_is_404(monkeypatch, enabled_store):
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: enabled_store)
    with pytest.raises(HTTPException) as exc_info:
        _run(routes_module.get_tafsir(200, 1, Response()))
    assert exc_info.value.status_code == 404


def test_route_disabled_feature_returns_available_false(monkeypatch, tafsir_db):
    disabled_store = TafsirStore(settings=Settings(tafsir_enabled=False, tafsir_db_path=tafsir_db))
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: disabled_store)
    resp = _run(routes_module.get_tafsir(1, 1, Response()))
    assert resp.available is False
    assert resp.entries == []


def test_route_corrupted_db_is_503_not_hidden(monkeypatch, tmp_path):
    bad_path = tmp_path / "corrupt.db"
    conn = sqlite3.connect(str(bad_path))
    conn.execute("CREATE TABLE unrelated (id INTEGER)")
    conn.commit()
    conn.close()
    store = TafsirStore(settings=Settings(tafsir_enabled=True, tafsir_db_path=bad_path))
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: store)

    with pytest.raises(HTTPException) as exc_info:
        _run(routes_module.get_tafsir(1, 1, Response()))
    assert exc_info.value.status_code == 503


def test_route_fixture_content_is_not_long_cached(monkeypatch, enabled_store):
    """Fixture content must never get the 24h public cache header, even
    though it's otherwise a normal 'available' response."""
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: enabled_store)
    response = Response()
    resp = _run(routes_module.get_tafsir(1, 1, response))
    assert resp.content_environment == "fixture"
    assert response.headers.get("cache-control") == "no-store"


def test_route_production_content_gets_long_cache(monkeypatch, production_tafsir_db):
    store = TafsirStore(settings=Settings(tafsir_enabled=True, tafsir_db_path=production_tafsir_db, environment="production"))
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: store)
    response = Response()
    resp = _run(routes_module.get_tafsir(1, 1, response))
    assert resp.available is True
    assert resp.content_environment == "production"
    assert "max-age" in response.headers.get("cache-control", "")


def test_route_missing_tafsir_is_not_cached(monkeypatch, enabled_store):
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: enabled_store)
    response = Response()
    _run(routes_module.get_tafsir(2, 6, response))
    assert response.headers.get("cache-control") == "no-store"


def test_route_disabled_response_is_not_cached(monkeypatch, tafsir_db):
    disabled_store = TafsirStore(settings=Settings(tafsir_enabled=False, tafsir_db_path=tafsir_db))
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: disabled_store)
    response = Response()
    _run(routes_module.get_tafsir(1, 1, response))
    assert response.headers.get("cache-control") == "no-store"


def test_route_corrupted_response_is_not_cached(monkeypatch, tmp_path):
    bad_path = tmp_path / "corrupt.db"
    conn = sqlite3.connect(str(bad_path))
    conn.execute("CREATE TABLE unrelated (id INTEGER)")
    conn.commit()
    conn.close()
    store = TafsirStore(settings=Settings(tafsir_enabled=True, tafsir_db_path=bad_path))
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: store)

    with pytest.raises(HTTPException) as exc_info:
        _run(routes_module.get_tafsir(1, 1, Response()))
    assert exc_info.value.headers is not None
    assert exc_info.value.headers.get("Cache-Control") == "no-store"


# ─── Production/fixture safety guard ─────────────────────────────────────


def test_fixture_content_refused_when_environment_is_production(tafsir_db):
    """The hard guarantee from point 4: a fixture-tagged db must never be
    servable when settings.environment == 'production', even with the
    feature flag on."""
    store = TafsirStore(settings=Settings(tafsir_enabled=True, tafsir_db_path=tafsir_db, environment="production"))
    assert store.available() is False
    assert store.lookup("1:1") == []


def test_production_content_environment_serves_normally(production_tafsir_db):
    store = TafsirStore(settings=Settings(tafsir_enabled=True, tafsir_db_path=production_tafsir_db, environment="production"))
    assert store.available() is True
    assert store.lookup("1:1") != []
    assert store.content_environment == "production"


def test_fixture_content_serves_normally_in_development(tafsir_db):
    store = TafsirStore(settings=Settings(tafsir_enabled=True, tafsir_db_path=tafsir_db, environment="development"))
    assert store.available() is True
    assert store.content_environment == "fixture"


# ─── /tafsir/status (used by the frontend to hide the button entirely) ──


def test_status_endpoint_true_when_available(monkeypatch, enabled_store):
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: enabled_store)
    result = _run(routes_module.get_tafsir_status())
    assert result == {"enabled": True}


def test_status_endpoint_false_when_disabled(monkeypatch, tafsir_db):
    disabled_store = TafsirStore(settings=Settings(tafsir_enabled=False, tafsir_db_path=tafsir_db))
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: disabled_store)
    result = _run(routes_module.get_tafsir_status())
    assert result == {"enabled": False}


def test_status_endpoint_false_when_fixture_in_production(monkeypatch, tafsir_db):
    store = TafsirStore(settings=Settings(tafsir_enabled=True, tafsir_db_path=tafsir_db, environment="production"))
    monkeypatch.setattr(routes_module, "get_tafsir_store", lambda: store)
    result = _run(routes_module.get_tafsir_status())
    assert result == {"enabled": False}
