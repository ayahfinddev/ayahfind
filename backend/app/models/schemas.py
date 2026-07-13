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
