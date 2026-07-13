# Tafsir ingestion

Two approved collections: **Tafsir Ibn Kathir (Abridged)**, English, and
**Tafsir al-Sa'di**, Arabic. Stored in sqlite, isolated from the search
corpus and from the dormant SQLAlchemy Ayah/Surah models in
`backend/app/db`. Schema: `data_pipeline/tafsir_schema.py`.

## Database paths — read this before running anything

Two distinct filenames exist so fixture content can never be mistaken for,
or accidentally deployed as, production data:

| File | Meaning | Committed to git? |
|---|---|---|
| `data/tafsir.fixture.db` | Local/dev database, built from `data_pipeline/fixtures/tafsir_sample.json`. Placeholder text only (`[FIXTURE] ...`), tagged `content_environment=fixture`. | **No** — gitignored (`*.db`) |
| `data/tafsir.db` | The production path. Only ever written by `--live` ingestion, and only once real, permitted content exists. Tagged `content_environment=production`. | **Not yet** — gitignored (`*.db`) until a verified production dataset is deliberately approved and force-added |

Both are matched by the blanket `*.db` rule in `.gitignore`. Neither should
be committed casually — a production dataset gets committed as a deliberate,
reviewed decision once the licensing question below is resolved, not as a
side effect of running the ingestion script.

The backend reads `TAFSIR_DB_PATH` (`backend/app/core/config.py`,
`Settings.tafsir_db_path`), which **defaults to `data/tafsir.db`** — i.e.
production, absent by default, so the app can never accidentally pick up
fixture content in a deploy that doesn't set anything. For local
development, point it at the fixture db explicitly, e.g. in your local
`.env` (gitignored, never committed):

```
TAFSIR_ENABLED=true
TAFSIR_DB_PATH=data/tafsir.fixture.db
```

`TAFSIR_DB_PATH` is resolved relative to the process's working directory if
given as a relative path — run the backend from the repo root (as the
default `.claude/launch.json` dev config does) for `data/tafsir.fixture.db`
to resolve correctly, or use an absolute path.

Even if `TAFSIR_DB_PATH` were ever pointed at a fixture-tagged db in a
production deployment (`ENVIRONMENT=production`), `TafsirStore` refuses to
serve it — see `backend/app/services/tafsir_store.py`. That check is a
second line of defense; keeping fixture content out of the production
filename/path in the first place is the first.

## Current status: fixtures only, no real content sourced

Real ingestion is gated behind the two things below.

## What was verified against Quran Foundation's public docs (2026-07-13)

- **Auth**: Content API uses OAuth2 `client_credentials` grant (scope
  `content`) against the OAuth2 token endpoint, then `x-auth-token` +
  `x-client-id` headers on each content request. Requires a registered
  developer app — no app credentials exist for this project yet.
- **Resource catalogue**: confirmed via `/resources/tafsirs` — resource id
  **169** = "Ibn Kathir (Abridged)", English, slug `en-tafisr-ibn-kathir`;
  resource id **91** = "Al-Sa'di", Arabic, slug `ar-tafseer-al-saddi`. Both
  match the two approved sources.
- **Licensing (the actual blocker)**: Quran Foundation's Developer Terms of
  Service (`https://api-docs.quran.foundation/legal/developer-terms/`)
  state QF Content (defined to include translations, and by extension the
  same class of content as tafsir) **may not be cached or stored longer
  than 1 week unless expressly permitted**, and **may not be resold,
  sublicensed, or redistributed** except as integral to the end-user
  experience of the registered application — with no exception for
  non-commercial/open-source use.

  Committing a static `tafsir.db` to git and shipping it in a Docker image
  indefinitely is a stronger form of storage/redistribution than that
  1-week limit contemplates. Before running real ingestion, either:
  1. Get written permission from Quran Foundation for a static/committed
     dataset (their terms explicitly allow "unless expressly permitted"), or
  2. Switch to a **rebuild-on-deploy** model: ingest at Docker build time
     using build-time secrets, producing an image-local, *not committed*
     `tafsir.db` that's refreshed on every deploy (naturally more often
     than weekly for an actively developed app) — see `run_live_ingestion`
     in `data_pipeline/ingest_tafsir.py`, which already implements this
     shape and is off by default.

  A third-party mirror (e.g. the `spa5k/tafsir_api` GitHub project) was
  also checked — it re-serves the same quran.com-sourced content under an
  MIT license for its *code*, but does not resolve the content-licensing
  question above; using it would just move the same restriction one hop
  away, not clear it.

## Running ingestion

```bash
# Fixture mode (default, safe, no network) -> data/tafsir.fixture.db
python -m data_pipeline.ingest_tafsir

# Live mode -> data/tafsir.db (NOT enabled by default — see gating below)
python -m data_pipeline.ingest_tafsir --live

# Either mode accepts an explicit path override:
python -m data_pipeline.ingest_tafsir --db-path /some/other/path.db
```

Live mode requires, with no defaults/guesses baked in:

```
QURAN_FOUNDATION_OAUTH_TOKEN_URL=...   # from your app's dashboard
QURAN_FOUNDATION_API_BASE_URL=...      # from your app's dashboard
QURAN_FOUNDATION_CLIENT_ID=...
QURAN_FOUNDATION_CLIENT_SECRET=...
TAFSIR_LIVE_INGESTION_CONFIRMED=yes    # explicit ack that licensing was checked
```

Every ingestion run (fixture or live) builds into a temp sqlite file,
verifies it (`data_pipeline/tafsir_integrity.py`: schema version, approved
sources only, no empty bodies, checksums, valid `verse_key`s cross-checked
against `data/processed/ayahs_processed.json`, no duplicate entry-to-verse
mappings), and only then atomically replaces the target file. A failed or
incomplete run leaves the last good database at that path untouched.

## Turning the feature on

`TAFSIR_ENABLED` (in `backend/app/core/config.py`) defaults to `false`.
Set it to `true` only once a verified production `data/tafsir.db` (content
tagged `content_environment=production`) actually exists for that deploy —
`render.yaml` has deliberately **not** been changed to set this, since
flipping it on for production is a content-readiness decision, not a code
change. Tests build their own throwaway sqlite db per test (via pytest's
`tmp_path`) from the fixture JSON directly — they never depend on either
`data/tafsir.fixture.db` or `data/tafsir.db` existing on disk.
