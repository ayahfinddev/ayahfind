"""
Tafsir ingestion — builds a sqlite db from either local fixtures (default,
safe for dev/CI) or the live Quran Foundation Content API (--live, requires
registered app credentials; see docs/TAFSIR_INGESTION.md before using).

Two separate filenames on purpose, so fixture content can never be mistaken
for (or accidentally deployed as) production data:
  - data/tafsir.fixture.db  — fixture-mode default. Placeholder text only.
  - data/tafsir.db          — production path. Only ever written by --live,
    and only once real, permitted content exists (see docs/TAFSIR_INGESTION.md).
    The backend's TAFSIR_DB_PATH setting defaults to this path; point it at
    the fixture db locally via TAFSIR_DB_PATH=data/tafsir.fixture.db.
Both filenames are gitignored (*.db) — neither is meant to be committed
until a verified production dataset is deliberately approved.

Safety model:
  1. Ingestion always builds into a *temporary* sqlite file, never writes
     directly to the target path.
  2. The temp build is verified (schema version, approved sources only,
     no empty bodies, checksums, valid verse_keys, no duplicate mappings —
     see tafsir_integrity.verify_database) before it is trusted.
  3. Only a verified build replaces the target file, via os.replace()
     (atomic on the same volume). A failed/interrupted/incomplete run
     leaves the last good db untouched.
  4. Live-mode chapter fetches are paginated and each chapter's collected
     row count is checked against the known ayah_count for that surah
     before the chapter is considered complete; an incomplete chapter
     aborts the whole run before anything is written to disk.

Only two sources are approved (see tafsir_schema.APPROVED_SOURCE_SLUGS):
Tafsir Ibn Kathir (English, upstream resource id 169) and Tafsir al-Sa'di
(Arabic, upstream resource id 91). Anything else is rejected by the
integrity check even if accidentally included in a fixture/response.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from data_pipeline.download_quran import SURAHS_META  # noqa: E402
from data_pipeline.tafsir_integrity import load_valid_verse_keys, verify_database  # noqa: E402
from data_pipeline.tafsir_schema import (  # noqa: E402
    CONTENT_ENV_FIXTURE,
    CONTENT_ENV_PRODUCTION,
    SCHEMA_SQL,
    SCHEMA_VERSION,
    parse_verse_key,
    verse_key as make_verse_key,
)

PRODUCTION_DB_PATH = REPO_ROOT / "data" / "tafsir.db"
FIXTURE_DB_PATH = REPO_ROOT / "data" / "tafsir.fixture.db"
DEFAULT_FIXTURES_PATH = REPO_ROOT / "data_pipeline" / "fixtures" / "tafsir_sample.json"

AYAH_COUNT_BY_SURAH = {s[0]: s[4] for s in SURAHS_META}

# Sanitizer allowlist — deliberately minimal. No attributes on any tag (so no
# href/src/on*), no script/style/iframe/img. This is the *only* place raw
# upstream HTML is allowed to exist; everything downstream (db, API, UI)
# only ever sees the output of this function.
_ALLOWED_TAGS = {"p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "blockquote"}


def sanitize_html(raw: str) -> str:
    import nh3

    return nh3.clean(
        raw or "",
        tags=_ALLOWED_TAGS,
        attributes={},
        strip_comments=True,
        link_rel=None,
    ).strip()


@dataclass
class SourceSpec:
    slug: str
    upstream_resource_id: int | None
    title: str
    author: str
    language: str
    provider: str
    attribution: str
    license_note: str
    content_version: str | None


@dataclass
class RawRow:
    source_slug: str
    verse_key: str
    upstream_entry_id: str | None
    text: str


@dataclass
class GroupedEntry:
    upstream_entry_id: str | None
    text_html: str
    verse_keys: list[str]


class IngestionAborted(RuntimeError):
    """Raised when a build must not be allowed to replace the production db."""


# ─── Fixture-mode input ──────────────────────────────────────────────────


def load_fixture_source(path: Path = DEFAULT_FIXTURES_PATH) -> tuple[list[SourceSpec], list[RawRow]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    now = datetime.now(timezone.utc).isoformat()
    sources = [
        SourceSpec(
            slug=s["slug"],
            upstream_resource_id=s.get("upstream_resource_id"),
            title=s["title"],
            author=s["author"],
            language=s["language"],
            provider=s["provider"],
            attribution=s["attribution"],
            license_note=s["license_note"],
            content_version=s.get("content_version"),
        )
        for s in raw["sources"]
    ]
    # retrieved_at is set at build time, not baked into the fixture file.
    rows = [
        RawRow(
            source_slug=r["source_slug"],
            verse_key=r["verse_key"],
            upstream_entry_id=r.get("upstream_entry_id"),
            text=r["text"],
        )
        for r in raw["rows"]
    ]
    return sources, rows, now


# ─── Grouping: collapse consecutive identical-text rows into one entry ───


def group_rows_into_entries(rows: list[RawRow]) -> dict[str, list[GroupedEntry]]:
    """Grouped tafsir (one explanation covering several ayat) shows up
    upstream as the *same* text repeated across consecutive verse_keys of
    the same source. Collapse those runs into a single stored entry mapped
    to every verse_key it covers, rather than storing duplicate copies.
    """
    by_source: dict[str, list[RawRow]] = {}
    for r in rows:
        by_source.setdefault(r.source_slug, []).append(r)

    grouped: dict[str, list[GroupedEntry]] = {}
    for slug, source_rows in by_source.items():
        def sort_key(row: RawRow) -> tuple[int, int]:
            parsed = parse_verse_key(row.verse_key)
            if parsed is None:
                raise ValueError(f"invalid verse_key in fixture/response: {row.verse_key!r}")
            return parsed

        ordered = sorted(source_rows, key=sort_key)
        entries: list[GroupedEntry] = []
        current: GroupedEntry | None = None
        prev_surah, prev_ayah = None, None

        for row in ordered:
            surah, ayah = sort_key(row)
            sanitized = sanitize_html(row.text)
            contiguous = prev_surah == surah and prev_ayah == ayah - 1
            same_text = current is not None and current.text_html == sanitized
            if current is not None and contiguous and same_text:
                current.verse_keys.append(row.verse_key)
            else:
                current = GroupedEntry(
                    upstream_entry_id=row.upstream_entry_id,
                    text_html=sanitized,
                    verse_keys=[row.verse_key],
                )
                entries.append(current)
            prev_surah, prev_ayah = surah, ayah

        grouped[slug] = entries

    return grouped


# ─── Build + verify + swap ────────────────────────────────────────────────


def build_database(
    tmp_path: Path,
    sources: list[SourceSpec],
    grouped: dict[str, list[GroupedEntry]],
    retrieved_at: str,
    content_environment: str,
) -> None:
    if tmp_path.exists():
        tmp_path.unlink()
    conn = sqlite3.connect(str(tmp_path))
    try:
        conn.executescript(SCHEMA_SQL)
        conn.execute(
            "INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?)",
            (str(SCHEMA_VERSION),),
        )
        conn.execute(
            "INSERT INTO schema_meta (key, value) VALUES ('built_at', ?)",
            (retrieved_at,),
        )
        conn.execute(
            "INSERT INTO schema_meta (key, value) VALUES ('content_environment', ?)",
            (content_environment,),
        )

        source_ids: dict[str, int] = {}
        for s in sources:
            cur = conn.execute(
                """
                INSERT INTO tafsir_sources
                    (slug, upstream_resource_id, title, author, language,
                     provider, attribution, license_note, retrieved_at, content_version)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    s.slug,
                    s.upstream_resource_id,
                    s.title,
                    s.author,
                    s.language,
                    s.provider,
                    s.attribution,
                    s.license_note,
                    retrieved_at,
                    s.content_version,
                ),
            )
            source_ids[s.slug] = cur.lastrowid

        for slug, entries in grouped.items():
            source_id = source_ids.get(slug)
            if source_id is None:
                continue
            for entry in entries:
                checksum = hashlib.sha256(entry.text_html.encode("utf-8")).hexdigest()
                ordered_keys = sorted(entry.verse_keys, key=lambda k: parse_verse_key(k))
                verse_start, verse_end = ordered_keys[0], ordered_keys[-1]
                cur = conn.execute(
                    """
                    INSERT INTO tafsir_entries
                        (source_id, upstream_entry_id, text_html, checksum, char_length,
                         verse_start, verse_end)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        source_id,
                        entry.upstream_entry_id,
                        entry.text_html,
                        checksum,
                        len(entry.text_html),
                        verse_start,
                        verse_end,
                    ),
                )
                entry_id = cur.lastrowid
                conn.executemany(
                    "INSERT INTO tafsir_entry_verses (entry_id, verse_key) VALUES (?, ?)",
                    [(entry_id, vk) for vk in entry.verse_keys],
                )
        conn.commit()
    finally:
        conn.close()


def verify_and_swap(tmp_path: Path, final_path: Path) -> "IntegrityReport":  # noqa: F821
    conn = sqlite3.connect(f"file:{tmp_path}?mode=ro", uri=True)
    try:
        conn.execute("PRAGMA foreign_keys = ON")
        report = verify_database(conn, valid_verse_keys=load_valid_verse_keys())
    finally:
        conn.close()

    if not report.ok:
        # Leave the last good production db untouched; keep the failed
        # temp build around for inspection instead of silently discarding it.
        raise IngestionAborted(
            "tafsir build failed integrity checks, production db NOT replaced:\n"
            + "\n".join(f"  - {e}" for e in report.errors)
        )

    final_path.parent.mkdir(parents=True, exist_ok=True)
    os.replace(tmp_path, final_path)  # atomic on the same filesystem
    return report


def run_fixture_ingestion(
    final_db_path: Path = FIXTURE_DB_PATH,
    fixtures_path: Path = DEFAULT_FIXTURES_PATH,
):
    sources, rows, retrieved_at = load_fixture_source(fixtures_path)
    grouped = group_rows_into_entries(rows)
    tmp_path = final_db_path.with_suffix(".tmp")
    build_database(tmp_path, sources, grouped, retrieved_at, content_environment=CONTENT_ENV_FIXTURE)
    return verify_and_swap(tmp_path, final_db_path)


# ─── Live mode (Quran Foundation Content API) ────────────────────────────
#
# NOT executed by tests or by default. Requires a registered Quran Foundation
# developer app. Host/paths below are intentionally NOT hardcoded — this repo
# has not verified them against a real account (see docs/TAFSIR_INGESTION.md).
# Set these from your own app dashboard / the current docs before using --live.


def _require_live_env() -> dict[str, str]:
    required = [
        "QURAN_FOUNDATION_OAUTH_TOKEN_URL",
        "QURAN_FOUNDATION_API_BASE_URL",
        "QURAN_FOUNDATION_CLIENT_ID",
        "QURAN_FOUNDATION_CLIENT_SECRET",
    ]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        raise IngestionAborted(
            "Live ingestion requires these env vars (none are guessed/defaulted): "
            + ", ".join(missing)
            + ". See docs/TAFSIR_INGESTION.md."
        )
    return {k: os.environ[k] for k in required}


def _fetch_oauth_token(env: dict[str, str]) -> str:
    import httpx

    resp = httpx.post(
        env["QURAN_FOUNDATION_OAUTH_TOKEN_URL"],
        data={"grant_type": "client_credentials", "scope": "content"},
        auth=(env["QURAN_FOUNDATION_CLIENT_ID"], env["QURAN_FOUNDATION_CLIENT_SECRET"]),
        timeout=30.0,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _fetch_chapter_tafsir(
    env: dict[str, str], token: str, resource_id: int, chapter: int
) -> list[dict]:
    import httpx

    headers = {
        "x-auth-token": token,
        "x-client-id": env["QURAN_FOUNDATION_CLIENT_ID"],
    }
    rows: list[dict] = []
    page = 1
    while True:
        resp = httpx.get(
            f"{env['QURAN_FOUNDATION_API_BASE_URL']}/tafsirs/{resource_id}/by_chapter/{chapter}",
            params={"page": page},
            headers=headers,
            timeout=30.0,
        )
        resp.raise_for_status()
        payload = resp.json()
        rows.extend(payload.get("tafsirs", []))
        pagination = payload.get("pagination") or {}
        next_page = pagination.get("next_page")
        if not next_page:
            break
        page = next_page

    expected = AYAH_COUNT_BY_SURAH.get(chapter)
    if expected is not None and len(rows) < expected:
        raise IngestionAborted(
            f"chapter {chapter} incomplete for resource {resource_id}: "
            f"got {len(rows)} tafsir rows, expected >= {expected} ayahs"
        )
    return rows


LIVE_SOURCES = [
    # (slug, upstream_resource_id, title, author, language) — the two approved
    # collections only. provider/attribution/license_note are filled in once
    # the real terms are confirmed (see docs/TAFSIR_INGESTION.md); using
    # placeholder-but-honest text here rather than inventing legal language.
    ("ibn_kathir_en", 169, "Tafsir Ibn Kathir (Abridged)", "Hafiz Ibn Kathir", "en"),
    ("saadi_ar", 91, "Tafsir al-Sa'di", "Shaykh Abd al-Rahman al-Sa'di", "ar"),
]


def run_live_ingestion(final_db_path: Path = PRODUCTION_DB_PATH):
    """Implemented against the *documented* API contract (OAuth2
    client_credentials + paginated /tafsirs/{id}/by_chapter/{n}), but kept
    off by default. Requires:
      - the 4 QURAN_FOUNDATION_* env vars (no defaults/guesses — see
        docs/TAFSIR_INGESTION.md for how to obtain them), and
      - TAFSIR_LIVE_INGESTION_CONFIRMED=yes, an explicit acknowledgement
        that upstream licensing/redistribution terms have been checked
        for this deployment (see docs/TAFSIR_INGESTION.md — as of writing,
        Quran Foundation's Developer Terms restrict caching QF Content
        beyond 1 week and restrict redistribution without a separate
        written agreement, which the fixture pipeline exists to avoid
        triggering by accident).
    Not exercised by tests or CI.
    """
    if os.environ.get("TAFSIR_LIVE_INGESTION_CONFIRMED") != "yes":
        raise IngestionAborted(
            "Live ingestion is disabled until TAFSIR_LIVE_INGESTION_CONFIRMED=yes "
            "is set, confirming upstream licensing has been checked. "
            "See docs/TAFSIR_INGESTION.md."
        )
    env = _require_live_env()
    token = _fetch_oauth_token(env)
    retrieved_at = datetime.now(timezone.utc).isoformat()

    sources = [
        SourceSpec(
            slug=slug,
            upstream_resource_id=resource_id,
            title=title,
            author=author,
            language=language,
            provider="Quran Foundation (quran.com Content API)",
            attribution=f"{title} — via Quran Foundation",
            license_note=(
                "Sourced live from the Quran Foundation Content API under the "
                "operator's registered developer app; see docs/TAFSIR_INGESTION.md "
                "for the applicable terms in effect at ingestion time."
            ),
            content_version=None,
        )
        for slug, resource_id, title, author, language in LIVE_SOURCES
    ]

    all_rows: list[RawRow] = []
    for slug, resource_id, *_ in LIVE_SOURCES:
        for chapter in range(1, 115):
            chapter_rows = _fetch_chapter_tafsir(env, token, resource_id, chapter)
            for row in chapter_rows:
                all_rows.append(
                    RawRow(
                        source_slug=slug,
                        verse_key=row["verse_key"],
                        upstream_entry_id=str(row.get("id") or row.get("resource_id") or ""),
                        text=row.get("text", ""),
                    )
                )

    grouped = group_rows_into_entries(all_rows)
    tmp_path = final_db_path.with_suffix(".tmp")
    build_database(tmp_path, sources, grouped, retrieved_at, content_environment=CONTENT_ENV_PRODUCTION)
    return verify_and_swap(tmp_path, final_db_path)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a tafsir sqlite db (fixture mode by default -> data/tafsir.fixture.db)"
    )
    parser.add_argument("--live", action="store_true", help="Fetch from the live Quran Foundation API (not enabled yet)")
    parser.add_argument(
        "--db-path",
        type=Path,
        default=None,
        help="Defaults to data/tafsir.fixture.db (fixture mode) or data/tafsir.db (--live)",
    )
    parser.add_argument("--fixtures-path", type=Path, default=DEFAULT_FIXTURES_PATH)
    args = parser.parse_args()

    if args.live:
        db_path = args.db_path or PRODUCTION_DB_PATH
        run_live_ingestion(db_path)
        return

    db_path = args.db_path or FIXTURE_DB_PATH
    report = run_fixture_ingestion(db_path, args.fixtures_path)
    print(f"tafsir db built at {db_path} ({db_path.stat().st_size} bytes)")
    if report.warnings:
        for w in report.warnings:
            print(f"warning: {w}")


if __name__ == "__main__":
    main()
