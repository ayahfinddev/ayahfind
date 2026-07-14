"""
Production tafsir provider — Quran Foundation Content API + a bounded
in-memory TTL cache (tafsir_cache.py). No local file, no committed
database: this is what serves /api/v1/tafsir/* when
settings.environment == "production" (see tafsir_store.get_tafsir_store()).

Same duck-typed interface as the dev/test sqlite TafsirStore
(async available(), async lookup(verse_key), content_environment property),
so routes.py doesn't care which one it got.

Failure handling (see requirement list in the conversation that introduced
this module):
  - disabled / missing QF_CLIENT_ID+SECRET -> available() is False, no
    network call attempted.
  - resource catalogue no longer matches the expected source/language for
    ids 169/91 -> treated as unavailable and logged as an error (this needs
    a human, not a retry) — see validate_resource_catalogue.
  - upstream timeout / 429 / 5xx during a lookup -> caught, logged as a
    warning, that *source* is skipped for this request (the other source
    may still succeed) — never raised as a 503, never crashes the reader.
  - genuinely unexpected exceptions are logged and also degrade that
    source to "no entry", for the same reason.

Grouped verse ranges: Quran Foundation's by_chapter response repeats the
exact same text across every verse_key a single explanation covers (the
same behavior observed from the ingestion-time API contract). This module
collapses consecutive identical-text rows within a chapter into one
verse_start/verse_end range, mirroring data_pipeline/ingest_tafsir.py's
group_rows_into_entries (duplicated rather than imported — see
tafsir_store.py's docstring on why backend/ doesn't import data_pipeline/
at runtime).
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from app.core.config import Settings, get_settings
from app.services.qf_client import QFCredentialsMissing, QFUpstreamError, QuranFoundationClient
from app.services.tafsir_cache import BoundedTTLCache
from app.services.tafsir_store import TafsirEntryRow

logger = logging.getLogger("ayahfind.tafsir.qf")

RESOURCE_VALIDATION_COOLDOWN_SECONDS = 30.0

# Approved sources only. resource_id/expected_* are cross-checked against
# GET /resources/tafsirs at first use (validate_resource_catalogue) so a
# silent upstream catalogue change can't swap in the wrong content.
SOURCE_SPECS: dict[str, dict] = {
    "ibn_kathir_en": {
        "resource_id": 169,
        "expected_language_contains": "english",
        "expected_name_contains": "kathir",
        "source_title": "Tafsir Ibn Kathir (Abridged)",
        "author": "Hafiz Ibn Kathir",
        "language": "en",
        "provider": "Quran Foundation (Content API)",
        "attribution": "Tafsir Ibn Kathir (Abridged) — via Quran Foundation",
        "license_note": (
            "Live from the Quran Foundation Content API under the operator's "
            "registered developer app; cached in-memory for a bounded time "
            "well under Quran Foundation's terms."
        ),
    },
    "saadi_ar": {
        "resource_id": 91,
        "expected_language_contains": "arabic",
        "expected_name_contains": "sa",
        "source_title": "Tafsir al-Sa'di",
        "author": "Shaykh Abd al-Rahman al-Sa'di",
        "language": "ar",
        "provider": "Quran Foundation (Content API)",
        "attribution": "تفسير السعدي — via Quran Foundation",
        "license_note": (
            "Live from the Quran Foundation Content API under the operator's "
            "registered developer app; cached in-memory for a bounded time "
            "well under Quran Foundation's terms."
        ),
    },
}

_ALLOWED_TAGS = {"p", "br", "strong", "em", "b", "i", "ul", "ol", "li", "blockquote"}


class QFResourceMismatch(Exception):
    """Resource id 169/91 no longer maps to the expected source/language —
    needs a human to look at Quran Foundation's catalogue, not a retry."""


def sanitize_html(raw: str) -> str:
    import nh3

    return nh3.clean(raw or "", tags=_ALLOWED_TAGS, attributes={}, strip_comments=True, link_rel=None).strip()


@dataclass
class _GroupedEntry:
    verse_start_ayah: int
    verse_end_ayah: int
    text_html: str

    def covers(self, ayah: int) -> bool:
        return self.verse_start_ayah <= ayah <= self.verse_end_ayah


def group_chapter_rows(rows: list[dict]) -> list[_GroupedEntry]:
    """rows: [{"verse_key": "2:3", "text": "<p>...</p>"}, ...] for one
    chapter of one resource, in any order. Consecutive ayahs (by ayah
    number) with identical sanitized text collapse into one entry."""

    def ayah_of(row: dict) -> int:
        return int(row["verse_key"].split(":")[1])

    ordered = sorted(rows, key=ayah_of)
    grouped: list[_GroupedEntry] = []
    current: _GroupedEntry | None = None
    prev_ayah: int | None = None

    for row in ordered:
        ayah = ayah_of(row)
        sanitized = sanitize_html(row.get("text", ""))
        contiguous = prev_ayah is not None and ayah == prev_ayah + 1
        if current is not None and contiguous and current.text_html == sanitized and sanitized:
            current.verse_end_ayah = ayah
        elif sanitized:
            current = _GroupedEntry(verse_start_ayah=ayah, verse_end_ayah=ayah, text_html=sanitized)
            grouped.append(current)
        else:
            current = None
        prev_ayah = ayah

    return grouped


class QFTafsirProvider:
    def __init__(self, settings: Settings | None = None, *, client: QuranFoundationClient | None = None) -> None:
        self._settings = settings or get_settings()
        self._client = client or QuranFoundationClient(self._settings)
        self._cache: BoundedTTLCache[tuple[str, int], list[_GroupedEntry]] = BoundedTTLCache(
            max_entries=self._settings.tafsir_cache_max_entries,
            ttl_seconds=self._settings.tafsir_cache_ttl_seconds,
        )
        self._validated = False
        self._resource_ok = False
        self._last_validation_attempt = 0.0
        self._logged_disabled_or_missing_creds = False

    @property
    def content_environment(self) -> str | None:
        return "production" if self._resource_ok else None

    async def validate_resource_catalogue(self) -> None:
        payload = await self._client.request_json("GET", "/resources/tafsirs")
        resources = payload.get("tafsirs") or payload.get("resources") or []
        by_id = {r.get("id"): r for r in resources if isinstance(r, dict)}

        for slug, spec in SOURCE_SPECS.items():
            resource_id = spec["resource_id"]
            resource = by_id.get(resource_id)
            if resource is None:
                raise QFResourceMismatch(f"resource id {resource_id} ({slug}) not found in catalogue")

            language = str(resource.get("language_name") or resource.get("language") or "").lower()
            name = str(
                resource.get("name")
                or resource.get("translated_name", {}).get("name")
                or resource.get("author_name")
                or ""
            ).lower()

            if spec["expected_language_contains"] not in language:
                raise QFResourceMismatch(
                    f"resource {resource_id} ({slug}) language={language!r}, "
                    f"expected to contain {spec['expected_language_contains']!r}"
                )
            if spec["expected_name_contains"] not in name:
                raise QFResourceMismatch(
                    f"resource {resource_id} ({slug}) name={name!r}, "
                    f"expected to contain {spec['expected_name_contains']!r}"
                )

    async def available(self) -> bool:
        if not self._settings.tafsir_enabled:
            if not self._logged_disabled_or_missing_creds:
                self._logged_disabled_or_missing_creds = True
                logger.info("tafsir_summary enabled=False mode=quran_foundation status=disabled")
            return False

        if not self._client.has_credentials():
            if not self._logged_disabled_or_missing_creds:
                self._logged_disabled_or_missing_creds = True
                logger.warning(
                    "tafsir_summary enabled=True mode=quran_foundation status=unavailable:missing_credentials"
                )
            return False

        if self._validated:
            return self._resource_ok

        now = time.monotonic()
        if now - self._last_validation_attempt < RESOURCE_VALIDATION_COOLDOWN_SECONDS:
            return self._resource_ok
        self._last_validation_attempt = now

        try:
            await self.validate_resource_catalogue()
            self._resource_ok = True
            self._validated = True
            logger.info(
                "tafsir_summary enabled=True mode=quran_foundation qf_env=%s status=ok n_sources=%s",
                self._settings.qf_env,
                len(SOURCE_SPECS),
            )
        except QFResourceMismatch as e:
            self._resource_ok = False
            self._validated = True  # permanent until a human fixes it and redeploys
            logger.error("tafsir_resource_mismatch err=%s", e)
        except QFCredentialsMissing as e:
            self._resource_ok = False
            self._validated = True
            logger.warning("tafsir_summary status=unavailable:missing_credentials err=%s", e)
        except QFUpstreamError as e:
            self._resource_ok = False
            logger.warning("tafsir_validation_upstream_error err=%s", e)  # not permanent — retry allowed
        except Exception as e:  # never let validation crash the app
            self._resource_ok = False
            logger.error("tafsir_validation_failed err=%s", e)

        return self._resource_ok

    async def _get_chapter_entries(self, slug: str, resource_id: int, surah: int) -> list[_GroupedEntry]:
        cache_key = (slug, surah)
        cached = self._cache.get(cache_key)
        if cached is not None:
            return cached

        rows: list[dict] = []
        page = 1
        while True:
            payload = await self._client.request_json(
                "GET", f"/tafsirs/{resource_id}/by_chapter/{surah}", params={"page": page}
            )
            rows.extend(payload.get("tafsirs", []))
            next_page = (payload.get("pagination") or {}).get("next_page")
            if not next_page:
                break
            page = next_page

        grouped = group_chapter_rows(rows)
        self._cache.set(cache_key, grouped)
        return grouped

    async def lookup(self, verse_key: str) -> list[TafsirEntryRow]:
        if not await self.available():
            return []

        surah_str, ayah_str = verse_key.split(":")
        surah, ayah = int(surah_str), int(ayah_str)

        results: list[TafsirEntryRow] = []
        for slug, spec in SOURCE_SPECS.items():
            try:
                entries = await self._get_chapter_entries(slug, spec["resource_id"], surah)
            except QFUpstreamError as e:
                logger.warning("tafsir_qf_upstream_error verse_key=%s source=%s err=%s", verse_key, slug, e)
                continue
            except Exception as e:
                logger.error("tafsir_qf_unexpected_error verse_key=%s source=%s err=%s", verse_key, slug, e)
                continue

            for entry in entries:
                if entry.covers(ayah):
                    results.append(
                        TafsirEntryRow(
                            source_slug=slug,
                            source_title=spec["source_title"],
                            author=spec["author"],
                            language=spec["language"],
                            provider=spec["provider"],
                            attribution=spec["attribution"],
                            license_note=spec["license_note"],
                            verse_start=f"{surah}:{entry.verse_start_ayah}",
                            verse_end=f"{surah}:{entry.verse_end_ayah}",
                            text_html=entry.text_html,
                        )
                    )
                    break

        return results
