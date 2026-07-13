"""
Tafsir lookup — isolated sqlite store, decoupled from the search corpus and
the dormant SQLAlchemy Ayah/Surah models (backend/app/db).

Connection handling: every lookup opens a short-lived, read-only sqlite3
connection via a `file:...?mode=ro` URI and closes it before returning.
No connection is stored on the store or reused across requests/threads —
for a store this small (a couple of tiny tables, sub-millisecond queries)
that's simpler and safer than a shared connection or a pool, and it keeps
failure modes local to a single request.

Because sqlite3 is blocking, routes must call into this from a worker
thread (e.g. `await asyncio.to_thread(store.lookup, verse_key)`), never
directly on the event loop.

A cheap, cached-per-process sanity check gates every lookup:
  - schema version matches
  - only approved sources present
  - content_environment is one of "fixture"/"production", and a fixture
    build is refused outright when settings.environment == "production" —
    even if TAFSIR_ENABLED=true. This is the hard guarantee that a fixture
    db can never accidentally serve real users.
This is NOT a full integrity scan — that's the ingestion script's job (see
data_pipeline/tafsir_integrity.py, run before a build is ever allowed to
replace data/tafsir.db).

The sanity check also logs one structured summary line the first time it
runs per process (enabled/disabled, db present/missing, content type,
source/entry counts, status) — see _check_sanity. It never runs at app
startup and never blocks the main application: a disabled or missing
tafsir db just makes available()/lookup() report accordingly.

Failures are split into two kinds on purpose (see routes.py):
  - TafsirUnavailable: disabled, db missing, or fails the sanity check —
    the feature degrades gracefully (available: false).
  - TafsirCorrupted: db is enabled + present but a query blew up — this is
    a real bug and must be logged/500'd, not silently swallowed.
"""

from __future__ import annotations

import logging
import re
import sqlite3
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.core.config import Settings, get_settings

logger = logging.getLogger("ayahfind.tafsir")

SCHEMA_VERSION = "1"  # keep in sync with data_pipeline.tafsir_schema.SCHEMA_VERSION
APPROVED_SOURCE_SLUGS = ("ibn_kathir_en", "saadi_ar")
# keep in sync with data_pipeline.tafsir_schema.{CONTENT_ENV_FIXTURE,CONTENT_ENV_PRODUCTION}
CONTENT_ENV_FIXTURE = "fixture"
CONTENT_ENV_PRODUCTION = "production"


class TafsirUnavailable(Exception):
    """Disabled, db missing, or fails the cheap sanity check."""


class TafsirCorrupted(Exception):
    """DB is enabled + present but a query against it failed unexpectedly."""


@dataclass
class TafsirEntryRow:
    source_slug: str
    source_title: str
    author: str
    language: str
    provider: str
    attribution: str
    license_note: str
    verse_start: str
    verse_end: str
    text_html: str


def _connect_ro(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True, timeout=5.0)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn


def html_to_plain_text(html: str) -> str:
    """Ingestion-sanitized HTML -> plain text. Plain text is the serving
    format for the first implementation: it needs no frontend HTML
    rendering at all (no dangerouslySetInnerHTML), which is the safer
    default until there's a concrete need for the richer markup."""
    text = re.sub(r"(?i)</(p|li|blockquote)>", "\n", html)
    text = re.sub(r"(?i)<br\s*/?>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


class TafsirStore:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._sanity_checked = False
        self._sane = False
        self._content_environment: str | None = None

    @property
    def content_environment(self) -> str | None:
        """Populated once available()/lookup() has run at least once."""
        return self._content_environment

    def _log_summary(self, *, status: str, conn: sqlite3.Connection | None) -> None:
        n_sources = n_entries = 0
        if conn is not None:
            try:
                n_sources = conn.execute("SELECT COUNT(*) AS n FROM tafsir_sources").fetchone()["n"]
                n_entries = conn.execute("SELECT COUNT(*) AS n FROM tafsir_entries").fetchone()["n"]
            except sqlite3.DatabaseError:
                pass
        logger.info(
            "tafsir_summary enabled=%s db_present=%s content_environment=%s "
            "n_sources=%s n_entries=%s status=%s",
            self._settings.tafsir_enabled,
            self._settings.tafsir_db_path.exists(),
            self._content_environment,
            n_sources,
            n_entries,
            status,
        )

    def _check_sanity(self) -> bool:
        if self._sanity_checked:
            return self._sane
        self._sanity_checked = True
        path = self._settings.tafsir_db_path

        if not path.exists():
            self._log_summary(status="unavailable:db_missing", conn=None)
            self._sane = False
            return False

        try:
            conn = _connect_ro(path)
            try:
                row = conn.execute(
                    "SELECT value FROM schema_meta WHERE key = 'schema_version'"
                ).fetchone()
                if row is None or str(row["value"]) != SCHEMA_VERSION:
                    self._log_summary(status="unavailable:schema_version_mismatch", conn=conn)
                    self._sane = False
                    return False

                env_row = conn.execute(
                    "SELECT value FROM schema_meta WHERE key = 'content_environment'"
                ).fetchone()
                self._content_environment = env_row["value"] if env_row else None

                if self._content_environment not in (CONTENT_ENV_FIXTURE, CONTENT_ENV_PRODUCTION):
                    self._log_summary(status="unavailable:content_environment_missing_or_invalid", conn=conn)
                    self._sane = False
                    return False

                # Hard guarantee: a fixture build must never serve production
                # traffic, even if someone leaves TAFSIR_ENABLED=true.
                if self._settings.environment == "production" and self._content_environment == CONTENT_ENV_FIXTURE:
                    self._log_summary(status="unavailable:fixture_content_refused_in_production", conn=conn)
                    self._sane = False
                    return False

                slugs = {r["slug"] for r in conn.execute("SELECT slug FROM tafsir_sources")}
                unapproved = slugs - set(APPROVED_SOURCE_SLUGS)
                if unapproved:
                    logger.error("tafsir_unapproved_sources found=%s", sorted(unapproved))
                    self._log_summary(status="unavailable:unapproved_sources", conn=conn)
                    self._sane = False
                    return False

                self._log_summary(status="ok", conn=conn)
            finally:
                conn.close()
        except sqlite3.DatabaseError as e:
            logger.error("tafsir_db_corrupted err=%s", e)
            raise TafsirCorrupted(str(e)) from e

        self._sane = True
        return True

    def available(self) -> bool:
        if not self._settings.tafsir_enabled:
            if not self._sanity_checked:
                self._sanity_checked = True
                self._log_summary(status="disabled", conn=None)
            return False
        return self._check_sanity()

    def lookup(self, verse_key: str) -> list[TafsirEntryRow]:
        """[] if disabled/missing/no entries for this verse_key. Raises
        TafsirCorrupted if the db is enabled+present but the query fails."""
        if not self.available():
            return []

        path = self._settings.tafsir_db_path
        placeholders = ",".join("?" for _ in APPROVED_SOURCE_SLUGS)
        try:
            conn = _connect_ro(path)
            try:
                rows = conn.execute(
                    f"""
                    SELECT s.slug AS source_slug, s.title AS source_title, s.author AS author,
                           s.language AS language, s.provider AS provider,
                           s.attribution AS attribution, s.license_note AS license_note,
                           e.verse_start AS verse_start, e.verse_end AS verse_end,
                           e.text_html AS text_html
                    FROM tafsir_entry_verses v
                    JOIN tafsir_entries e ON e.id = v.entry_id
                    JOIN tafsir_sources s ON s.id = e.source_id
                    WHERE v.verse_key = ? AND s.slug IN ({placeholders})
                    ORDER BY s.slug
                    """,
                    (verse_key, *APPROVED_SOURCE_SLUGS),
                ).fetchall()
            finally:
                conn.close()
        except sqlite3.DatabaseError as e:
            logger.error("tafsir_query_failed verse_key=%s err=%s", verse_key, e)
            raise TafsirCorrupted(str(e)) from e

        return [
            TafsirEntryRow(
                source_slug=r["source_slug"],
                source_title=r["source_title"],
                author=r["author"],
                language=r["language"],
                provider=r["provider"],
                attribution=r["attribution"],
                license_note=r["license_note"],
                verse_start=r["verse_start"],
                verse_end=r["verse_end"],
                text_html=r["text_html"],
            )
            for r in rows
        ]


@lru_cache
def get_tafsir_store() -> TafsirStore:
    return TafsirStore()
