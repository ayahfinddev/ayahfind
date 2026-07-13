"""
Integrity checks for a built tafsir.db, run by the ingestion script before a
temp database is allowed to replace the production one, and reusable by tests.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from dataclasses import dataclass, field
from pathlib import Path

from data_pipeline.tafsir_schema import (
    APPROVED_SOURCE_SLUGS,
    SCHEMA_VERSION,
    VALID_CONTENT_ENVIRONMENTS,
    is_valid_verse_key,
    parse_verse_key,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
PROCESSED_AYAHS = REPO_ROOT / "data" / "processed" / "ayahs_processed.json"


@dataclass
class IntegrityReport:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors


def load_valid_verse_keys(processed_path: Path = PROCESSED_AYAHS) -> set[str] | None:
    """Canonical verse_keys from the same corpus the search engine serves.

    Returns None (skip cross-check) if the processed corpus isn't available,
    e.g. in a minimal test environment — callers should treat that as "can't
    verify against the corpus" rather than a hard failure.
    """
    if not processed_path.exists():
        return None
    raw = json.loads(processed_path.read_text(encoding="utf-8"))
    return {f"{a['surah_number']}:{a['ayah_number']}" for a in raw.get("ayahs", [])}


@dataclass
class DbSummary:
    content_environment: str | None
    n_sources: int
    n_entries: int


def read_db_summary(conn: sqlite3.Connection) -> DbSummary:
    """Cheap counts for logging (startup/first-use), not a full integrity scan."""
    conn.row_factory = sqlite3.Row
    env_row = conn.execute(
        "SELECT value FROM schema_meta WHERE key = 'content_environment'"
    ).fetchone()
    n_sources = conn.execute("SELECT COUNT(*) AS n FROM tafsir_sources").fetchone()["n"]
    n_entries = conn.execute("SELECT COUNT(*) AS n FROM tafsir_entries").fetchone()["n"]
    return DbSummary(
        content_environment=env_row["value"] if env_row else None,
        n_sources=n_sources,
        n_entries=n_entries,
    )


def verify_database(conn: sqlite3.Connection, *, valid_verse_keys: set[str] | None = None) -> IntegrityReport:
    report = IntegrityReport()
    conn.row_factory = sqlite3.Row

    # Schema version
    row = conn.execute(
        "SELECT value FROM schema_meta WHERE key = 'schema_version'"
    ).fetchone()
    if row is None:
        report.errors.append("schema_meta.schema_version is missing")
    elif str(row["value"]) != str(SCHEMA_VERSION):
        report.errors.append(
            f"schema_version mismatch: expected {SCHEMA_VERSION}, found {row['value']}"
        )

    # content_environment must be explicitly recorded and one of the known
    # values — this is what tafsir_store.py uses to refuse fixture content
    # in a production deployment, so it must never be silently absent.
    env_row = conn.execute(
        "SELECT value FROM schema_meta WHERE key = 'content_environment'"
    ).fetchone()
    if env_row is None:
        report.errors.append("schema_meta.content_environment is missing")
    elif env_row["value"] not in VALID_CONTENT_ENVIRONMENTS:
        report.errors.append(f"schema_meta.content_environment is invalid: {env_row['value']!r}")

    # Approved sources only
    slugs = {r["slug"] for r in conn.execute("SELECT slug FROM tafsir_sources")}
    unapproved = slugs - APPROVED_SOURCE_SLUGS
    if unapproved:
        report.errors.append(f"unapproved tafsir sources present: {sorted(unapproved)}")
    missing = APPROVED_SOURCE_SLUGS - slugs
    if missing:
        report.warnings.append(f"approved sources not present in this build: {sorted(missing)}")

    # No empty bodies; checksum + length must match stored text
    for r in conn.execute("SELECT id, source_id, text_html, checksum, char_length FROM tafsir_entries"):
        text = r["text_html"] or ""
        if not text.strip():
            report.errors.append(f"tafsir_entries.id={r['id']} has an empty body")
            continue
        actual_checksum = hashlib.sha256(text.encode("utf-8")).hexdigest()
        if actual_checksum != r["checksum"]:
            report.errors.append(f"tafsir_entries.id={r['id']} checksum mismatch (content corrupted)")
        if len(text) != r["char_length"]:
            report.errors.append(
                f"tafsir_entries.id={r['id']} char_length mismatch "
                f"(stored={r['char_length']}, actual={len(text)}) — possible truncation"
            )

    # verse_start/verse_end must be well-formed and consistent with the
    # actual verse mappings for that entry (min/max of what it covers)
    for r in conn.execute("SELECT id, verse_start, verse_end FROM tafsir_entries"):
        start, end = parse_verse_key(r["verse_start"]), parse_verse_key(r["verse_end"])
        if start is None or end is None:
            report.errors.append(f"tafsir_entries.id={r['id']} has malformed verse_start/verse_end")
            continue
        if start > end:
            report.errors.append(f"tafsir_entries.id={r['id']} verse_start is after verse_end")
        mapped = [
            row["verse_key"]
            for row in conn.execute(
                "SELECT verse_key FROM tafsir_entry_verses WHERE entry_id = ?", (r["id"],)
            )
        ]
        if mapped:
            parsed_mapped = sorted(parse_verse_key(k) for k in mapped)
            if parsed_mapped[0] != start or parsed_mapped[-1] != end:
                report.errors.append(
                    f"tafsir_entries.id={r['id']} verse_start/verse_end don't match its verse mappings"
                )

    # Verse key validity (format, and against the real corpus if available)
    all_keys = [r["verse_key"] for r in conn.execute("SELECT DISTINCT verse_key FROM tafsir_entry_verses")]
    for key in all_keys:
        if not is_valid_verse_key(key):
            report.errors.append(f"malformed verse_key: {key!r}")
    if valid_verse_keys is not None:
        unknown = [k for k in all_keys if is_valid_verse_key(k) and k not in valid_verse_keys]
        if unknown:
            report.errors.append(
                f"verse_key(s) not found in the Quran corpus: {sorted(unknown)[:10]}"
                + (" ..." if len(unknown) > 10 else "")
            )

    # No duplicate entry-to-verse mappings within the same source
    dupes = conn.execute(
        """
        SELECT tev.verse_key AS verse_key, te.source_id AS source_id, COUNT(*) AS n
        FROM tafsir_entry_verses tev
        JOIN tafsir_entries te ON te.id = tev.entry_id
        GROUP BY tev.verse_key, te.source_id
        HAVING COUNT(*) > 1
        """
    ).fetchall()
    if dupes:
        report.errors.append(
            "duplicate entry-to-verse mappings for the same source: "
            + ", ".join(f"source_id={d['source_id']} verse_key={d['verse_key']}" for d in dupes[:10])
        )

    # Every entry must map to at least one verse
    orphans = conn.execute(
        """
        SELECT te.id FROM tafsir_entries te
        LEFT JOIN tafsir_entry_verses tev ON tev.entry_id = te.id
        WHERE tev.entry_id IS NULL
        """
    ).fetchall()
    if orphans:
        report.errors.append(f"entries with no verse mapping: {[o['id'] for o in orphans]}")

    return report
