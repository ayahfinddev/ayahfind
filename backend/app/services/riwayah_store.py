"""
Riwayah-aware text/metadata service layer — additive and parallel to the
existing (Hafs-only) QuranStore-driven search pipeline. This module never
touches QuranStore's data, arabic_text.py normalization, or the
search/ranking pipeline; for hafs-an-asim it simply reads *through*
QuranStore, since that corpus already *is* the verified Hafs dataset.

Mirrors the tafsir_store.py pattern: duck-typed results, never raises out
to routes.py for a "not available" case — every lookup returns a typed
result object with an availability flag, so a missing/disabled riwayah
dataset degrades gracefully instead of ever producing a 500 or fabricated
content.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.core.arabic_text import arabic_for_display
from app.core.riwayat import DEFAULT_RIWAYAH_ID, RIWAYAH_REGISTRY, get_riwayah
from app.services.quran_store import QuranStore

_store: QuranStore | None = None


def _get_quran_store() -> QuranStore:
    global _store
    if _store is None:
        _store = QuranStore()
    return _store


@dataclass
class RiwayahAyahText:
    surah: int
    ayah: int
    riwayah_id: str
    text_available: bool
    text_ar: str | None = None
    text_ar_display: str | None = None
    # e.g. "unknown_riwayah" | "dataset_unavailable" | "ayah_not_found"
    unavailable_reason: str | None = None


@dataclass
class EquivalentReadingsResult:
    surah: int
    ayah: int
    displayed_riwayah_id: str
    equivalent_riwayah_ids: list[str]
    comparison_complete: bool
    note: str | None = None


@dataclass
class ReadingVariantsSummary:
    surah: int
    ayah: int
    canonical_riwayah_id: str
    equivalent_riwayah_ids: list[str]
    has_reading_variants: bool


@dataclass
class RiwayahSymbolAvailability:
    riwayah_id: str
    symbol_set_id: str | None
    available: bool


@dataclass
class AudioAvailabilityResult:
    riwayah_id: str
    reciter_id: str | None
    available: bool
    reason: str | None = None


def get_ayah_text(surah: int, ayah: int, riwayah_id: str) -> RiwayahAyahText:
    riwayah = get_riwayah(riwayah_id)
    if riwayah is None:
        return RiwayahAyahText(
            surah=surah, ayah=ayah, riwayah_id=riwayah_id,
            text_available=False, unavailable_reason="unknown_riwayah",
        )
    if not riwayah.is_enabled or not riwayah.text_dataset_id:
        return RiwayahAyahText(
            surah=surah, ayah=ayah, riwayah_id=riwayah_id,
            text_available=False, unavailable_reason="dataset_unavailable",
        )

    if riwayah.text_dataset_id == "hafs-an-asim-madinah-v1":
        store = _get_quran_store()
        rec = store.get_by_ref(surah, ayah)
        if rec is None:
            return RiwayahAyahText(
                surah=surah, ayah=ayah, riwayah_id=riwayah_id,
                text_available=False, unavailable_reason="ayah_not_found",
            )
        return RiwayahAyahText(
            surah=surah,
            ayah=ayah,
            riwayah_id=riwayah_id,
            text_available=True,
            text_ar=rec.text_ar,
            text_ar_display=arabic_for_display(rec.text_ar, rec.surah_number, rec.ayah_number),
        )

    # Future verified riwayah text datasets get their own adapter branch
    # here once integrated (see docs/RIWAYAH_ARCHITECTURE.md) — never
    # fabricate text in the meantime.
    return RiwayahAyahText(
        surah=surah, ayah=ayah, riwayah_id=riwayah_id,
        text_available=False, unavailable_reason="dataset_unavailable",
    )


def get_equivalent_readings(surah: int, ayah: int, riwayah_id: str) -> EquivalentReadingsResult:
    """Which riwayat share the exact displayed form at this ayah.

    Honesty constraint: with only one riwayah's text dataset in the
    repository there is nothing to compare against, so this never claims
    "Common to all" or lists any riwayah beyond the one actually
    displayed — `comparison_complete=False` tells callers to render a
    "not yet computed" state rather than a false equivalence claim."""
    enabled_ids = [r.id for r in RIWAYAH_REGISTRY.values() if r.is_enabled]

    if riwayah_id not in enabled_ids:
        return EquivalentReadingsResult(
            surah=surah, ayah=ayah, displayed_riwayah_id=riwayah_id,
            equivalent_riwayah_ids=[], comparison_complete=False,
            note="riwayah_unavailable",
        )

    if len(enabled_ids) <= 1:
        return EquivalentReadingsResult(
            surah=surah, ayah=ayah, displayed_riwayah_id=riwayah_id,
            equivalent_riwayah_ids=[riwayah_id], comparison_complete=False,
            note="only_one_riwayah_dataset_available",
        )

    # Placeholder for when >=2 enabled riwayat exist: real per-ayah text
    # comparison against verified datasets goes here.
    return EquivalentReadingsResult(
        surah=surah, ayah=ayah, displayed_riwayah_id=riwayah_id,
        equivalent_riwayah_ids=[riwayah_id], comparison_complete=False,
        note="comparison_not_yet_implemented",
    )


def get_reading_variants(surah: int, ayah: int) -> ReadingVariantsSummary:
    """Lightweight metadata safe to attach to every search-result card
    without loading any full alternative-riwayah dataset."""
    equivalence = get_equivalent_readings(surah, ayah, DEFAULT_RIWAYAH_ID)
    return ReadingVariantsSummary(
        surah=surah,
        ayah=ayah,
        canonical_riwayah_id=DEFAULT_RIWAYAH_ID,
        equivalent_riwayah_ids=equivalence.equivalent_riwayah_ids,
        has_reading_variants=len(equivalence.equivalent_riwayah_ids) > 1,
    )


def get_riwayah_symbols(riwayah_id: str) -> RiwayahSymbolAvailability:
    """Reports which symbol_set_id applies and whether it is actually
    populated. The symbol *content* (glyphs/explanations) is a curated
    frontend dataset (src/lib/quranSymbols.ts), not backend/DB data — this
    is metadata-only, mirroring the "lightweight metadata now, full
    content lazily" approach used elsewhere."""
    riwayah = get_riwayah(riwayah_id)
    if riwayah is None:
        return RiwayahSymbolAvailability(riwayah_id=riwayah_id, symbol_set_id=None, available=False)
    available = riwayah.is_enabled and riwayah.symbol_set_id != "pending-dataset"
    return RiwayahSymbolAvailability(
        riwayah_id=riwayah_id,
        symbol_set_id=riwayah.symbol_set_id,
        available=available,
    )


def get_available_audio(riwayah_id: str, reciter_id: str | None = None) -> AudioAvailabilityResult:
    """Whether verified audio exists for this riwayah at all. Reciter-level
    filtering (which specific reciter folders match which riwayah) happens
    on the frontend, where the reciter registry lives (src/lib/reciters.ts)
    — this only answers the riwayah-level question, so the reader never
    silently plays Hafs audio while labeled as another riwayah."""
    riwayah = get_riwayah(riwayah_id)
    if riwayah is None:
        return AudioAvailabilityResult(
            riwayah_id=riwayah_id, reciter_id=reciter_id, available=False,
            reason="unknown_riwayah",
        )
    if not riwayah.is_enabled or not riwayah.audio_dataset_id:
        return AudioAvailabilityResult(
            riwayah_id=riwayah_id, reciter_id=reciter_id, available=False,
            reason="dataset_unavailable",
        )
    return AudioAvailabilityResult(riwayah_id=riwayah_id, reciter_id=reciter_id, available=True)
