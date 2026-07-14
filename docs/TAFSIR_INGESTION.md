# Tafsir architecture

Two approved collections: **Tafsir Ibn Kathir (Abridged)**, English
(Quran Foundation resource id **169**), and **Tafsir al-Sa'di**, Arabic
(resource id **91**).

**Production serves these live from the Quran Foundation Content API**,
cached in a bounded in-memory TTL cache — there is no committed database.
This supersedes the earlier "ingest once, commit `data/tafsir.db`, refresh
on redeploy" design: Quran Foundation's terms cap caching at under a week,
and a committed/shipped sqlite file doesn't fit that even if refreshed
every deploy. See `backend/app/services/qf_tafsir_provider.py`.

Local development and tests still use a fixture sqlite db (see below) —
that part of the architecture is unchanged.

## How provider selection works

`get_tafsir_store()` in `backend/app/services/tafsir_store.py` is the only
thing `backend/app/api/routes.py` calls. It picks based on
`Settings.environment`:

| `ENVIRONMENT` | Provider | Data source |
|---|---|---|
| `production` | `QFTafsirProvider` (`qf_tafsir_provider.py`) | Live Quran Foundation Content API + in-memory cache |
| anything else (`development`, tests) | `TafsirStore` (`tafsir_store.py`) | Local fixture sqlite db, `data/tafsir.fixture.db` |

Both expose the same async interface (`available()`, `lookup(verse_key)`,
`content_environment`), so routes.py and the response schema
(`TafsirVerseResponse`) are unchanged by this — the frontend needs no
changes at all.

## Production: Quran Foundation Content API

### Required environment variables (Render)

```
QF_CLIENT_ID=...
QF_CLIENT_SECRET=...
QF_ENV=production
```

Credentials are backend-only — never read by or exposed to the frontend
(`src/lib/api.ts` only ever calls our own `/api/v1/tafsir/*` routes). No
token URL or API base URL needs to be configured: `QF_ENV` selects between
the production and prelive host pairs, which are hardcoded constants in
`qf_client.py` (confirmed against Quran Foundation's public docs,
2026-07-13 — see below).

### OAuth2 client_credentials flow (`qf_client.py`)

- Token endpoint: `POST https://oauth2.quran.foundation/oauth2/token`
  (production) / `https://prelive-oauth2.quran.foundation/oauth2/token`
  (prelive) — HTTP Basic auth (`client_id:client_secret`),
  `grant_type=client_credentials`, `scope=content`.
- Content API base: `https://apis.quran.foundation/content/api/v4`
  (production) / `https://apis-prelive.quran.foundation/content/api/v4`
  (prelive) — headers `x-auth-token: <access_token>`, `x-client-id:
  <QF_CLIENT_ID>`.
- The token is cached in-process until shortly before `expires_in` elapses
  (60s buffer). A 401 on any content request triggers exactly one token
  refresh and one retry — a second 401 is not retried again.
- **Not independently verified**: the exact query-parameter contract for a
  single-verse tafsir endpoint (a "get one ayah's tafsir" endpoint appears
  to exist per the docs, but its parameter names couldn't be confirmed
  with confidence). `qf_client.py` therefore only uses the endpoint whose
  shape *was* verified verbatim: `GET /tafsirs/{resource_id}/by_chapter/{n}`
  (paginated, `{"tafsirs": [...], "pagination": {...}}`). The provider
  fetches and caches a whole chapter at a time and extracts the requested
  ayah from it — this also naturally warms the cache for every other ayah
  in that surah.

### Resource catalogue validation (`qf_tafsir_provider.py`)

Before serving anything, `QFTafsirProvider` calls
`GET /resources/tafsirs` once per process and checks that resource 169 is
still English/"Kathir" and 91 is still Arabic/"Sa" (case-insensitive
substring match on whatever language/name fields the catalogue returns).
A mismatch makes the whole provider report unavailable and logs an error —
this needs a human to look at Quran Foundation's catalogue, not a retry.
A transient failure *during* validation (timeout/5xx) is not treated as a
mismatch — it's retried on a later request (30s cooldown) rather than
sticking permanently.

**Not independently verified**: the exact field names in the
`/resources/tafsirs` response on the *new* gated API (the shape used here —
`id`, `language_name`, `name` — is what the legacy, unauthenticated
`api.quran.com/api/v4/resources/tafsirs` returned when checked; the gated
API is presumed to return the same or similar fields but this hasn't been
confirmed against a real token). **This should be smoke-tested against the
real API as the first thing done with real credentials**, before flipping
`TAFSIR_ENABLED=true` in production.

### Caching (`tafsir_cache.py`)

Bounded in-memory TTL cache, keyed by `(source_slug, surah_number)` —
114 surahs x 2 sources = at most ~228 keys, well under the configured
`tafsir_cache_max_entries` (300) bound. Entries expire after
`tafsir_cache_ttl_seconds` (default 6 days — under Quran Foundation's
7-day cap). Resets on every process restart/redeploy since it's pure
in-memory (Render's free plan has no persistent disk, which is exactly why
this isn't sqlite-on-disk).

### Failure handling

- **Disabled or missing credentials** → `available()` is `False`, no
  network call attempted. `/api/v1/tafsir/status` returns
  `{"enabled": false}`, the frontend hides the Tafsir button entirely.
- **Resource mismatch** → same as above, but logged as an error (needs a
  human).
- **Upstream timeout / 429 / 5xx during a lookup** → caught per-source,
  logged as a warning, that source is skipped for this request (the other
  source may still succeed); the route returns its normal graceful
  `available: false` shape, never a 503. The reader never breaks.
- Credentials and raw provider error bodies are never included in logs or
  responses — only status codes and our own messages.

## Local development / tests: fixture sqlite (unchanged)

| File | Meaning | Committed to git? |
|---|---|---|
| `data/tafsir.fixture.db` | Local/dev database, built from `data_pipeline/fixtures/tafsir_sample.json`. Placeholder text only (`[FIXTURE] ...`), tagged `content_environment=fixture`. | **No** — gitignored (`*.db`) |
| `data/tafsir.db` | Legacy production path from the superseded committed-db design. No longer used by the app (production now reads live from Quran Foundation instead) — kept only because `data_pipeline/ingest_tafsir.py --live` still writes here if ever run manually. | **No** — gitignored (`*.db`), and shouldn't be populated going forward |

```bash
# Fixture mode (default, safe, no network) -> data/tafsir.fixture.db
python -m data_pipeline.ingest_tafsir
```

Local `.env` (gitignored):

```
TAFSIR_ENABLED=true
TAFSIR_DB_PATH=data/tafsir.fixture.db
# ENVIRONMENT unset/"development" -> get_tafsir_store() picks the sqlite path
```

Tests build their own throwaway sqlite db per test (via pytest's
`tmp_path`) directly from the fixture JSON — they never depend on
`data/tafsir.fixture.db` existing on disk, and the QF-backed provider's
tests (`test_qf_client.py`, `test_tafsir_cache.py`,
`test_qf_tafsir_provider.py`) never touch the real network — everything is
mocked via `httpx.MockTransport`.

`data_pipeline/ingest_tafsir.py --live` (batch-ingest into a committed db)
still exists but is superseded and shouldn't be used for production
anymore — it predates the live-API architecture and is kept only in case a
one-off offline snapshot is ever needed for something unrelated to serving
production traffic.

## Turning the feature on in production — manual steps required

1. **Register a Quran Foundation developer app** and obtain
   `QF_CLIENT_ID` / `QF_CLIENT_SECRET` (production credentials, not
   prelive, unless intentionally testing against prelive first).
2. **Confirm the resource catalogue smoke-test**: with real credentials,
   call `GET /resources/tafsirs` once (e.g. via curl, or by temporarily
   enabling the feature against prelive) and confirm the response actually
   has `id`, and a language/name field `validate_resource_catalogue`
   can match against — adjust `qf_tafsir_provider.py`'s field lookups if
   the real shape differs from what's assumed here.
3. **Set on Render**: `QF_CLIENT_ID`, `QF_CLIENT_SECRET`, `QF_ENV=production`,
   and only then `TAFSIR_ENABLED=true`. None of these are set in
   `render.yaml` — flipping this on is a deliberate deploy-time decision,
   not a code change.
4. No frontend environment variable is needed — the frontend only ever
   calls our own backend.
