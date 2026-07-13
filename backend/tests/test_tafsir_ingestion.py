"""Tests for the tafsir ingestion pipeline (schema, grouping, sanitization,
integrity checks, and the build/verify/swap safety mechanism).

Runs entirely against the fixture dataset — never touches the network or
Quran Foundation. See data_pipeline/ingest_tafsir.py for the live-mode path,
which is intentionally not exercised here.
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from data_pipeline.ingest_tafsir import (
    IngestionAborted,
    build_database,
    group_rows_into_entries,
    load_fixture_source,
    sanitize_html,
    verify_and_swap,
)
from data_pipeline.tafsir_integrity import verify_database
from data_pipeline.tafsir_schema import APPROVED_SOURCE_SLUGS, CONTENT_ENV_FIXTURE, SCHEMA_VERSION

FIXTURES = ROOT / "data_pipeline" / "fixtures" / "tafsir_sample.json"


@pytest.fixture()
def built_db(tmp_path) -> Path:
    sources, rows, retrieved_at = load_fixture_source(FIXTURES)
    grouped = group_rows_into_entries(rows)
    final_path = tmp_path / "tafsir.db"
    tmp_db = final_path.with_suffix(".tmp")
    build_database(tmp_db, sources, grouped, retrieved_at, content_environment=CONTENT_ENV_FIXTURE)
    verify_and_swap(tmp_db, final_path)
    return final_path


def _connect_ro(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


# ─── Sanitization ─────────────────────────────────────────────────────────


def test_sanitize_strips_script_and_event_handlers():
    raw = "<script>alert('xss')</script><img src=x onerror=\"alert(1)\">hello<a href=\"javascript:alert(2)\">click</a>"
    clean = sanitize_html(raw)
    assert "<script" not in clean
    assert "onerror" not in clean
    assert "javascript:" not in clean
    assert "hello" in clean


def test_sanitize_keeps_allowlisted_tags():
    clean = sanitize_html("<p>Some <strong>bold</strong> text.</p>")
    assert "<p>" in clean
    assert "<strong>" in clean


def test_ingested_sanitization_fixture_is_clean(built_db):
    conn = _connect_ro(built_db)
    row = conn.execute(
        """
        SELECT te.text_html FROM tafsir_entries te
        JOIN tafsir_entry_verses tev ON tev.entry_id = te.id
        JOIN tafsir_sources s ON s.id = te.source_id
        WHERE s.slug = 'saadi_ar' AND tev.verse_key = '1:4'
        """
    ).fetchone()
    conn.close()
    assert row is not None
    assert "<script" not in row["text_html"]
    assert "onerror" not in row["text_html"]
    assert "javascript:" not in row["text_html"]
    assert "الدين" in row["text_html"]  # real content survives sanitization


# ─── Grouping (2:1-2:5 collapses into one entry) ─────────────────────────


def test_grouped_rows_collapse_into_single_entry(built_db):
    conn = _connect_ro(built_db)
    rows = conn.execute(
        """
        SELECT te.id AS entry_id, tev.verse_key FROM tafsir_entries te
        JOIN tafsir_entry_verses tev ON tev.entry_id = te.id
        JOIN tafsir_sources s ON s.id = te.source_id
        WHERE s.slug = 'ibn_kathir_en' AND tev.verse_key IN ('2:1','2:2','2:3','2:4','2:5')
        """
    ).fetchall()
    conn.close()
    assert len(rows) == 5
    entry_ids = {r["entry_id"] for r in rows}
    assert len(entry_ids) == 1, "grouped verses must map to exactly one entry"


def test_non_grouped_rows_stay_distinct(built_db):
    conn = _connect_ro(built_db)
    rows = conn.execute(
        """
        SELECT te.id AS entry_id, tev.verse_key FROM tafsir_entries te
        JOIN tafsir_entry_verses tev ON tev.entry_id = te.id
        JOIN tafsir_sources s ON s.id = te.source_id
        WHERE s.slug = 'ibn_kathir_en' AND tev.verse_key IN ('1:1','1:2')
        """
    ).fetchall()
    conn.close()
    entry_ids = {r["entry_id"] for r in rows}
    assert len(entry_ids) == 2


# ─── Long entries are stored untruncated ─────────────────────────────────


def test_long_entry_not_truncated(built_db):
    conn = _connect_ro(built_db)
    row = conn.execute(
        """
        SELECT te.text_html, te.char_length FROM tafsir_entries te
        JOIN tafsir_entry_verses tev ON tev.entry_id = te.id
        WHERE tev.verse_key = '112:1'
        """
    ).fetchone()
    conn.close()
    assert row is not None
    assert row["char_length"] == len(row["text_html"])
    assert row["char_length"] > 1000
    assert "[FIXTURE END]" in row["text_html"]


# ─── Missing tafsir (no rows for an existing ayah) ───────────────────────


def test_missing_ayah_has_no_entry(built_db):
    conn = _connect_ro(built_db)
    row = conn.execute(
        "SELECT 1 FROM tafsir_entry_verses WHERE verse_key = '2:6'"
    ).fetchone()
    conn.close()
    assert row is None


# ─── Approved sources only ────────────────────────────────────────────────


def test_only_approved_sources_present(built_db):
    conn = _connect_ro(built_db)
    slugs = {r["slug"] for r in conn.execute("SELECT slug FROM tafsir_sources")}
    conn.close()
    assert slugs <= APPROVED_SOURCE_SLUGS
    assert slugs == APPROVED_SOURCE_SLUGS  # fixture covers both


def test_integrity_check_rejects_unapproved_source(built_db):
    conn = sqlite3.connect(str(built_db))
    conn.execute(
        """
        INSERT INTO tafsir_sources
            (slug, upstream_resource_id, title, author, language, provider,
             attribution, license_note, retrieved_at, content_version)
        VALUES ('rogue_source', 999, 'Rogue', 'Nobody', 'en', 'x', 'x', 'x', 'now', NULL)
        """
    )
    conn.commit()
    report = verify_database(conn)
    conn.close()
    assert not report.ok
    assert any("unapproved" in e for e in report.errors)


def test_integrity_check_rejects_checksum_tampering(built_db):
    conn = sqlite3.connect(str(built_db))
    conn.execute("UPDATE tafsir_entries SET text_html = text_html || ' tampered' WHERE id = 1")
    conn.commit()
    report = verify_database(conn)
    conn.close()
    assert not report.ok
    assert any("checksum" in e for e in report.errors)


def test_integrity_check_rejects_empty_body(built_db):
    conn = sqlite3.connect(str(built_db))
    conn.execute("UPDATE tafsir_entries SET text_html = '   ' WHERE id = 1")
    conn.commit()
    report = verify_database(conn)
    conn.close()
    assert not report.ok
    assert any("empty body" in e for e in report.errors)


def test_integrity_check_rejects_duplicate_source_verse_mapping(built_db):
    conn = sqlite3.connect(str(built_db))
    # Map a second entry from the same source to a verse_key that entry #1 already covers.
    other_entry = conn.execute(
        "SELECT id FROM tafsir_entries WHERE id != 1 LIMIT 1"
    ).fetchone()[0]
    existing_key = conn.execute(
        "SELECT verse_key FROM tafsir_entry_verses WHERE entry_id = 1 LIMIT 1"
    ).fetchone()[0]
    conn.execute(
        "INSERT INTO tafsir_entry_verses (entry_id, verse_key) VALUES (?, ?)",
        (other_entry, existing_key),
    )
    conn.commit()
    report = verify_database(conn)
    conn.close()
    assert not report.ok
    assert any("duplicate entry-to-verse" in e for e in report.errors)


def test_schema_version_recorded(built_db):
    conn = _connect_ro(built_db)
    row = conn.execute("SELECT value FROM schema_meta WHERE key = 'schema_version'").fetchone()
    conn.close()
    assert row["value"] == str(SCHEMA_VERSION)


def test_content_environment_recorded_as_fixture(built_db):
    conn = _connect_ro(built_db)
    row = conn.execute("SELECT value FROM schema_meta WHERE key = 'content_environment'").fetchone()
    conn.close()
    assert row["value"] == CONTENT_ENV_FIXTURE


def test_integrity_check_rejects_missing_content_environment(built_db):
    conn = sqlite3.connect(str(built_db))
    conn.execute("DELETE FROM schema_meta WHERE key = 'content_environment'")
    conn.commit()
    report = verify_database(conn)
    conn.close()
    assert not report.ok
    assert any("content_environment is missing" in e for e in report.errors)


def test_integrity_check_rejects_invalid_content_environment(built_db):
    conn = sqlite3.connect(str(built_db))
    conn.execute(
        "UPDATE schema_meta SET value = 'staging' WHERE key = 'content_environment'"
    )
    conn.commit()
    report = verify_database(conn)
    conn.close()
    assert not report.ok
    assert any("content_environment is invalid" in e for e in report.errors)


# ─── Build/verify/swap safety: a failed build must not clobber a good db ─


def test_failed_build_does_not_replace_existing_db(tmp_path):
    final_path = tmp_path / "tafsir.db"
    sources, rows, retrieved_at = load_fixture_source(FIXTURES)
    grouped = group_rows_into_entries(rows)

    good_tmp = final_path.with_suffix(".tmp")
    build_database(good_tmp, sources, grouped, retrieved_at, content_environment=CONTENT_ENV_FIXTURE)
    verify_and_swap(good_tmp, final_path)
    good_size = final_path.stat().st_size
    assert good_size > 0

    # Now build a deliberately broken version (inject an unapproved source)
    # and confirm verify_and_swap refuses to install it.
    broken_tmp = final_path.with_suffix(".tmp")
    build_database(broken_tmp, sources, grouped, retrieved_at, content_environment=CONTENT_ENV_FIXTURE)
    conn = sqlite3.connect(str(broken_tmp))
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

    with pytest.raises(IngestionAborted):
        verify_and_swap(broken_tmp, final_path)

    # The last good db must be untouched.
    assert final_path.stat().st_size == good_size


def test_repeated_ingestion_is_reproducible(tmp_path):
    """Running ingestion twice from the same fixtures should not accumulate
    duplicate rows across runs (each run replaces the file wholesale)."""
    final_path = tmp_path / "tafsir.db"
    for _ in range(2):
        sources, rows, retrieved_at = load_fixture_source(FIXTURES)
        grouped = group_rows_into_entries(rows)
        tmp_db = final_path.with_suffix(".tmp")
        build_database(tmp_db, sources, grouped, retrieved_at, content_environment=CONTENT_ENV_FIXTURE)
        verify_and_swap(tmp_db, final_path)

    conn = _connect_ro(final_path)
    n_sources = conn.execute("SELECT COUNT(*) AS n FROM tafsir_sources").fetchone()["n"]
    n_verses_1_1 = conn.execute(
        "SELECT COUNT(*) AS n FROM tafsir_entry_verses WHERE verse_key = '1:1'"
    ).fetchone()["n"]
    conn.close()
    assert n_sources == 2
    assert n_verses_1_1 == 2  # one per source (ibn_kathir_en + saadi_ar), not doubled
