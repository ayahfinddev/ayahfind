"""Pydantic API schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=10, ge=1, le=50)
    surah_context: int | None = None  # boost same-surah candidates in session
    debug: bool = False  # include timings_ms + lexical_trace in JSON (ops only)


class SearchCandidate(BaseModel):
    surah: int
    ayah: int
    confidence: float
    text_ar: str | None = None
    text_ar_display: str | None = None
    transliteration: str | None = None
    translation_en: str | None = None
    phonetic_score: float | None = None
    semantic_score: float | None = None
    audio_url: str | None = None


class SearchResponse(BaseModel):
    query: str
    normalized_query: str | None = None
    intent_hint: str | None = None
    message: str | None = None
    error: str | None = None
    details: str | None = None
    results: list[SearchCandidate] = Field(default_factory=list)


class AyahDetail(BaseModel):
    surah: int
    ayah: int
    text_ar: str
    text_ar_display: str | None = None
    transliteration: str | None
    translation_en: str | None
    phonetic_primary: str | None
    phonetic_latin: str | None
    audio_url: str | None = None


class ReaderSurahResponse(BaseModel):
    surah: int
    name_en: str
    name_ar: str
    ayahs: list[AyahDetail]


class TafsirEntryOut(BaseModel):
    source_slug: str
    source_title: str
    author: str
    language: str
    provider: str
    attribution: str
    license_note: str
    verse_start: str
    verse_end: str
    text: str


class TafsirVerseResponse(BaseModel):
    verse_key: str
    available: bool
    entries: list[TafsirEntryOut] = Field(default_factory=list)
    message: str | None = None
    # "fixture" | "production" | None — lets the UI show an unmistakable
    # "test content" banner; also None whenever available=False.
    content_environment: str | None = None


# --- Riwayah (Quran reading transmission) support -------------------------
# Additive only: none of the schemas above are modified. See
# app/core/riwayat.py for the registry and app/services/riwayah_store.py
# for the service layer these responses are built from.


class RiwayahDefinitionOut(BaseModel):
    id: str
    display_name: str
    short_name: str
    qiraah_name: str
    imam_name: str
    narrator_name: str
    text_dataset_id: str | None = None
    audio_dataset_id: str | None = None
    symbol_set_id: str
    color_token: str
    is_default: bool
    is_enabled: bool


class RiwayatListResponse(BaseModel):
    riwayat: list[RiwayahDefinitionOut] = Field(default_factory=list)
    default_riwayah_id: str


class RiwayahAyahResponse(BaseModel):
    surah: int
    ayah: int
    riwayah_id: str
    available: bool
    text_ar: str | None = None
    text_ar_display: str | None = None
    unavailable_reason: str | None = None


class RiwayahReaderSurahResponse(BaseModel):
    surah: int
    riwayah_id: str
    available: bool
    name_en: str | None = None
    name_ar: str | None = None
    ayahs: list[RiwayahAyahResponse] = Field(default_factory=list)
    unavailable_reason: str | None = None


class ReadingVariantsResponse(BaseModel):
    surah: int
    ayah: int
    canonical_riwayah_id: str
    equivalent_riwayah_ids: list[str] = Field(default_factory=list)
    has_reading_variants: bool


class EquivalentReadingsResponse(BaseModel):
    surah: int
    ayah: int
    displayed_riwayah_id: str
    equivalent_riwayah_ids: list[str] = Field(default_factory=list)
    comparison_complete: bool
    note: str | None = None


class RiwayahSymbolAvailabilityResponse(BaseModel):
    riwayah_id: str
    symbol_set_id: str | None = None
    available: bool


class AudioAvailabilityResponse(BaseModel):
    riwayah_id: str
    reciter_id: str | None = None
    available: bool
    reason: str | None = None
