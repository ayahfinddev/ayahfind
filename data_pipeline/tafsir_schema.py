"""
Tafsir SQLite schema — isolated from the search corpus and the dormant
SQLAlchemy Ayah/Surah models. Three tables so grouped commentary (one
explanation covering several ayat) is modeled explicitly instead of via
a surah/ayah-range scan:

  tafsir_sources        one row per approved collection (Ibn Kathir EN, Al-Sa'di AR)
  tafsir_entries        one row per distinct explanation (may cover >1 verse)
  tafsir_entry_verses    entry_id -> canonical verse_key ("2:3"), indexed exact match
"""

from __future__ import annotations

import re

SCHEMA_VERSION = 1

# Stable AyahFind-side slugs. Anything else found in tafsir_sources at load
# time is unapproved and should be ignored/flagged, not served.
APPROVED_SOURCE_SLUGS = {"ibn_kathir_en", "saadi_ar"}

# schema_meta['content_environment'] — a db built from fixtures must never be
# servable in a production deployment, even if TAFSIR_ENABLED=true (see
# tafsir_store.py's production/fixture guard).
CONTENT_ENV_FIXTURE = "fixture"
CONTENT_ENV_PRODUCTION = "production"
VALID_CONTENT_ENVIRONMENTS = {CONTENT_ENV_FIXTURE, CONTENT_ENV_PRODUCTION}

VERSE_KEY_RE = re.compile(r"^(?P<surah>[0-9]{1,3}):(?P<ayah>[0-9]{1,3})$")

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_meta (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tafsir_sources (
    id                    INTEGER PRIMARY KEY,
    slug                  TEXT NOT NULL UNIQUE,
    upstream_resource_id  INTEGER,
    title                 TEXT NOT NULL,
    author                TEXT NOT NULL,
    language              TEXT NOT NULL,
    provider              TEXT NOT NULL,
    attribution           TEXT NOT NULL,
    license_note          TEXT NOT NULL,
    retrieved_at          TEXT NOT NULL,
    content_version       TEXT
);

CREATE TABLE IF NOT EXISTS tafsir_entries (
    id                 INTEGER PRIMARY KEY,
    source_id          INTEGER NOT NULL REFERENCES tafsir_sources(id) ON DELETE CASCADE,
    upstream_entry_id  TEXT,
    text_html          TEXT NOT NULL,
    checksum           TEXT NOT NULL,
    char_length        INTEGER NOT NULL,
    verse_start        TEXT NOT NULL,
    verse_end          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tafsir_entry_verses (
    entry_id   INTEGER NOT NULL REFERENCES tafsir_entries(id) ON DELETE CASCADE,
    verse_key  TEXT NOT NULL,
    PRIMARY KEY (entry_id, verse_key)
);

CREATE INDEX IF NOT EXISTS idx_entry_verses_key ON tafsir_entry_verses(verse_key);
CREATE INDEX IF NOT EXISTS idx_entries_source ON tafsir_entries(source_id);
"""


def verse_key(surah: int, ayah: int) -> str:
    return f"{surah}:{ayah}"


def parse_verse_key(key: str) -> tuple[int, int] | None:
    m = VERSE_KEY_RE.match(key.strip())
    if not m:
        return None
    return int(m.group("surah")), int(m.group("ayah"))


def is_valid_verse_key(key: str) -> bool:
    parsed = parse_verse_key(key)
    if parsed is None:
        return False
    surah, ayah = parsed
    return 1 <= surah <= 114 and ayah >= 1
