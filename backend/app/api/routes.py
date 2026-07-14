"""FastAPI route handlers."""

from __future__ import annotations

import asyncio
import logging
import tempfile
import time
import traceback
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import JSONResponse

from app.api.diagnostics import build_debug_search_payload, build_health_payload
from app.api.errors import search_error_response, search_response_or_error
from app.core.config import get_settings
from app.core.riwayat import DEFAULT_RIWAYAH_ID, list_riwayat
from app.models.schemas import (
    AudioAvailabilityResponse,
    AyahDetail,
    EquivalentReadingsResponse,
    ReaderSurahResponse,
    ReadingVariantsResponse,
    RiwayahAyahResponse,
    RiwayahDefinitionOut,
    RiwayahReaderSurahResponse,
    RiwayahSymbolAvailabilityResponse,
    RiwayatListResponse,
    SearchRequest,
    SearchResponse,
    TafsirEntryOut,
    TafsirVerseResponse,
)
from app.services import riwayah_store
from app.services.quran_store import QuranStore
from app.services.search_service import SearchService
from app.services.tafsir_store import TafsirCorrupted, get_tafsir_store, html_to_plain_text

logger = logging.getLogger("ayahfind.search")

router = APIRouter()
_search: SearchService | None = None
_store: QuranStore | None = None


def get_search() -> SearchService:
    global _search
    if _search is None:
        _search = SearchService()
    return _search


def get_store() -> QuranStore:
    global _store
    if _store is None:
        _store = QuranStore()
    return _store


@router.get("/health")
async def health(request: Request) -> dict:
    return build_health_payload(request)


@router.get("/debug-search")
async def debug_search(
    request: Request,
    q: str = Query(default="qul huwa allahu ahad", max_length=500),
    top_k: int = Query(default=3, ge=1, le=10),
) -> dict:
    return build_debug_search_payload(request, query=q, top_k=top_k)


@router.post("/search/unified")
async def search_unified(body: SearchRequest, request: Request):
    settings = get_settings()
    ayah_count = getattr(request.app.state, "ayah_count", 0)
    ua = request.headers.get("user-agent", "")[:120]
    t0 = time.perf_counter()
    q_preview = body.query[:120]
    q_len = len(body.query)

    logger.info(
        "search_incoming ts=%s query_len=%s top_k=%s ayah_count=%s ua=%r query=%r",
        time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        q_len,
        body.top_k,
        ayah_count,
        ua,
        q_preview,
    )

    try:

        def _run():
            svc = get_search()
            return svc.unified_search_timed(
                body.query, body.top_k, surah_context=body.surah_context
            )

        resp, timings = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(None, _run),
            timeout=settings.search_timeout_seconds,
        )
        duration_ms = round((time.perf_counter() - t0) * 1000, 1)
        if getattr(body, "debug", False):
            from fastapi.responses import JSONResponse
            from app.core.build_info import BUILD_ID, RETRIEVAL_VERSION

            payload = resp.model_dump() if hasattr(resp, "model_dump") else resp.dict()
            payload["timings_ms"] = timings
            payload["retrieval_version"] = RETRIEVAL_VERSION
            payload["build_id"] = BUILD_ID
            payload["lexical_trace"] = timings.get("lexical_path")
            return JSONResponse(content=payload)
        normalized = resp.normalized_query or ""

        if not resp.results:
            logger.warning(
                "search_no_results duration_ms=%s timings=%s query_len=%s normalized=%r",
                duration_ms,
                timings,
                q_len,
                normalized[:120],
            )
        else:
            top = resp.results[0]
            logger.info(
                "search_ok duration_ms=%s results=%s top=%s:%s conf=%.4f timings=%s query_len=%s normalized=%r",
                duration_ms,
                len(resp.results),
                top.surah,
                top.ayah,
                top.confidence,
                timings,
                q_len,
                normalized[:80],
            )

        return resp

    except asyncio.TimeoutError:
        duration_ms = round((time.perf_counter() - t0) * 1000, 1)
        logger.error(
            "search_timeout duration_ms=%s query_len=%s limit_s=%s",
            duration_ms,
            q_len,
            settings.search_timeout_seconds,
        )
        return JSONResponse(
            status_code=200,
            content=search_error_response(
                body.query,
                f"Search timed out after {settings.search_timeout_seconds}s",
                status_hint="search_timeout",
            ),
        )
    except FileNotFoundError as e:
        logger.error("search_corpus_missing query=%r err=%s", q_preview, e)
        return JSONResponse(
            status_code=503,
            content=search_error_response(body.query, str(e), status_hint="corpus_missing"),
        )
    except Exception as e:
        duration_ms = round((time.perf_counter() - t0) * 1000, 1)
        logger.error(
            "search_failed duration_ms=%s query_len=%s err=%s\n%s",
            duration_ms,
            q_len,
            e,
            traceback.format_exc(),
        )
        return JSONResponse(
            status_code=200,
            content=search_error_response(body.query, str(e), status_hint="search_failed"),
        )


@router.post("/search/audio", response_model=SearchResponse)
async def search_audio(
    file: UploadFile = File(...),
    top_k: int = 10,
) -> SearchResponse:
    suffix = Path(file.filename or "rec.wav").suffix or ".wav"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        path = Path(tmp.name)
    try:
        return get_search().audio_search(path, top_k=top_k)
    except Exception as e:
        logger.exception("audio_search_failed")
        raise HTTPException(status_code=500, detail=str(e)) from e
    finally:
        path.unlink(missing_ok=True)


@router.post("/search/phonetic", response_model=SearchResponse)
async def search_phonetic(body: SearchRequest) -> SearchResponse:
    svc = get_search()
    svc._store.load()
    hits = svc._phonetic.search(body.query, top_k=body.top_k)
    from app.core.ranking import ScoredCandidate, fuse_and_rank
    from app.models.schemas import SearchCandidate

    candidates: dict[int, ScoredCandidate] = {}
    for ayah_id, score in hits:
        rec = svc._store._by_id[ayah_id]
        candidates[ayah_id] = ScoredCandidate(
            surah=rec.surah_number, ayah=rec.ayah_number, ayah_id=ayah_id, phonetic_score=score
        )
    from app.core.arabic_text import arabic_for_display

    ranked = fuse_and_rank(candidates, svc._settings, body.top_k)
    results = []
    for c, conf in ranked:
        rec = svc._store._by_id[c.ayah_id]
        results.append(
            SearchCandidate(
                surah=c.surah,
                ayah=c.ayah,
                confidence=round(conf, 4),
                text_ar=rec.text_ar,
                text_ar_display=arabic_for_display(
                    rec.text_ar, rec.surah_number, rec.ayah_number
                ),
                translation_en=rec.translation_en,
                phonetic_score=round(c.phonetic_score, 4),
                audio_url=rec.audio_url,
            )
        )
    return SearchResponse(query=body.query, results=results)


@router.get("/ayah/{surah}/{ayah}", response_model=AyahDetail)
async def get_ayah(surah: int, ayah: int) -> AyahDetail:
    store = get_store()
    rec = store.get_by_ref(surah, ayah)
    if not rec:
        raise HTTPException(status_code=404, detail="Ayah not found")
    from app.core.arabic_text import arabic_for_display

    return AyahDetail(
        surah=rec.surah_number,
        ayah=rec.ayah_number,
        text_ar=rec.text_ar,
        text_ar_display=arabic_for_display(rec.text_ar, rec.surah_number, rec.ayah_number),
        transliteration=rec.transliteration,
        translation_en=rec.translation_en,
        phonetic_primary=rec.phonetic_primary,
        phonetic_latin=rec.phonetic_latin,
        audio_url=rec.audio_url,
    )


@router.get("/tafsir/status")
async def get_tafsir_status() -> dict:
    """Cheap, global feature-availability check — the frontend uses this to
    decide whether to render the Tafsir button at all, so it never shows a
    button that only leads to an "unavailable" dead end (see TafsirPanel)."""
    tafsir_store = get_tafsir_store()
    enabled = await tafsir_store.available()
    return {"enabled": enabled}


@router.get("/tafsir/{surah}/{ayah}", response_model=TafsirVerseResponse)
async def get_tafsir(surah: int, ayah: int, response: Response) -> TafsirVerseResponse:
    verse_key = f"{surah}:{ayah}"

    store = get_store()
    if store.get_by_ref(surah, ayah) is None:
        raise HTTPException(status_code=404, detail="Ayah not found")

    tafsir_store = get_tafsir_store()
    try:
        rows = await tafsir_store.lookup(verse_key)
    except TafsirCorrupted as e:
        logger.error("tafsir_corrupted verse_key=%s err=%s", verse_key, e)
        # headers= is required here (not response.headers) — FastAPI builds
        # its own response for a raised HTTPException, so mutations on the
        # injected `response` object before raising are silently dropped.
        raise HTTPException(
            status_code=503,
            detail="Tafsir is temporarily unavailable",
            headers={"Cache-Control": "no-store"},
        ) from e

    if not rows:
        logger.info("tafsir_unavailable verse_key=%s", verse_key)
        # Disabled / db-missing / no-entry-yet — none of these are safe to
        # cache long-term (content can show up, or the flag can flip).
        response.headers["Cache-Control"] = "no-store"
        return TafsirVerseResponse(
            verse_key=verse_key,
            available=False,
            entries=[],
            message="No tafsir available for this ayah yet.",
        )

    # Only cache long-term once we know this is verified production content —
    # fixture content (dev/test only) must never be cached like it's final.
    if tafsir_store.content_environment == "production":
        response.headers["Cache-Control"] = "public, max-age=86400"
    else:
        response.headers["Cache-Control"] = "no-store"

    entries = [
        TafsirEntryOut(
            source_slug=r.source_slug,
            source_title=r.source_title,
            author=r.author,
            language=r.language,
            provider=r.provider,
            attribution=r.attribution,
            license_note=r.license_note,
            verse_start=r.verse_start,
            verse_end=r.verse_end,
            text=html_to_plain_text(r.text_html),
        )
        for r in rows
    ]
    logger.info("tafsir_ok verse_key=%s sources=%s", verse_key, [e.source_slug for e in entries])
    return TafsirVerseResponse(
        verse_key=verse_key,
        available=True,
        entries=entries,
        content_environment=tafsir_store.content_environment,
    )


@router.get("/reader/{surah}", response_model=ReaderSurahResponse)
async def reader_surah(surah: int) -> ReaderSurahResponse:
    store = get_store()
    meta = store.get_surah_meta(surah)
    ayahs = store.get_surah_ayahs(surah)
    if not ayahs:
        raise HTTPException(status_code=404, detail="Surah not found")
    from app.core.arabic_text import arabic_for_display

    return ReaderSurahResponse(
        surah=surah,
        name_en=meta.name_en if meta else "",
        name_ar=meta.name_ar if meta else "",
        ayahs=[
            AyahDetail(
                surah=a.surah_number,
                ayah=a.ayah_number,
                text_ar=a.text_ar,
                text_ar_display=arabic_for_display(a.text_ar, a.surah_number, a.ayah_number),
                transliteration=a.transliteration,
                translation_en=a.translation_en,
                phonetic_primary=a.phonetic_primary,
                phonetic_latin=a.phonetic_latin,
                audio_url=a.audio_url,
            )
            for a in ayahs
        ],
    )


# --- Riwayah (Quran reading transmission) support -------------------------
# Additive only — none of the endpoints above are modified. Search stays
# Hafs-first (see /search/unified); these endpoints let the reader,
# Continue Reading, audio, and Qira'at panel become riwayah-aware without
# touching retrieval/ranking. See app/core/riwayat.py and
# app/services/riwayah_store.py.


@router.get("/riwayat", response_model=RiwayatListResponse)
async def list_riwayat_endpoint() -> RiwayatListResponse:
    return RiwayatListResponse(
        riwayat=[
            RiwayahDefinitionOut(
                id=r.id,
                display_name=r.display_name,
                short_name=r.short_name,
                qiraah_name=r.qiraah_name,
                imam_name=r.imam_name,
                narrator_name=r.narrator_name,
                text_dataset_id=r.text_dataset_id,
                audio_dataset_id=r.audio_dataset_id,
                symbol_set_id=r.symbol_set_id,
                color_token=r.color_token,
                is_default=r.is_default,
                is_enabled=r.is_enabled,
            )
            for r in list_riwayat()
        ],
        default_riwayah_id=DEFAULT_RIWAYAH_ID,
    )


@router.get("/riwayat/{riwayah_id}/ayah/{surah}/{ayah}", response_model=RiwayahAyahResponse)
async def get_riwayah_ayah(riwayah_id: str, surah: int, ayah: int, response: Response) -> RiwayahAyahResponse:
    result = riwayah_store.get_ayah_text(surah, ayah, riwayah_id)
    if not result.text_available:
        # Not found is a real 404; a disabled/unavailable riwayah is a
        # normal 200 with available=False so the UI can render a clear
        # "dataset unavailable" state instead of treating it as an error.
        if result.unavailable_reason == "ayah_not_found":
            raise HTTPException(status_code=404, detail="Ayah not found")
        response.headers["Cache-Control"] = "no-store"
    return RiwayahAyahResponse(
        surah=result.surah,
        ayah=result.ayah,
        riwayah_id=result.riwayah_id,
        available=result.text_available,
        text_ar=result.text_ar,
        text_ar_display=result.text_ar_display,
        unavailable_reason=result.unavailable_reason,
    )


@router.get("/riwayat/{riwayah_id}/reader/{surah}", response_model=RiwayahReaderSurahResponse)
async def riwayah_reader_surah(riwayah_id: str, surah: int, response: Response) -> RiwayahReaderSurahResponse:
    store = get_store()
    meta = store.get_surah_meta(surah)
    ayah_refs = store.get_surah_ayahs(surah)
    if not ayah_refs:
        raise HTTPException(status_code=404, detail="Surah not found")

    ayahs: list[RiwayahAyahResponse] = []
    any_available = False
    unavailable_reason: str | None = None
    for a in ayah_refs:
        result = riwayah_store.get_ayah_text(surah, a.ayah_number, riwayah_id)
        if result.text_available:
            any_available = True
        else:
            unavailable_reason = result.unavailable_reason
        ayahs.append(
            RiwayahAyahResponse(
                surah=result.surah,
                ayah=result.ayah,
                riwayah_id=result.riwayah_id,
                available=result.text_available,
                text_ar=result.text_ar,
                text_ar_display=result.text_ar_display,
                unavailable_reason=result.unavailable_reason,
            )
        )

    if not any_available:
        response.headers["Cache-Control"] = "no-store"

    return RiwayahReaderSurahResponse(
        surah=surah,
        riwayah_id=riwayah_id,
        available=any_available,
        name_en=meta.name_en if meta else None,
        name_ar=meta.name_ar if meta else None,
        ayahs=ayahs,
        unavailable_reason=None if any_available else unavailable_reason,
    )


@router.get("/reading-variants/{surah}/{ayah}", response_model=ReadingVariantsResponse)
async def get_reading_variants(surah: int, ayah: int, response: Response) -> ReadingVariantsResponse:
    store = get_store()
    if store.get_by_ref(surah, ayah) is None:
        raise HTTPException(status_code=404, detail="Ayah not found")
    summary = riwayah_store.get_reading_variants(surah, ayah)
    response.headers["Cache-Control"] = "no-store"  # honesty note evolves as datasets are added
    return ReadingVariantsResponse(
        surah=summary.surah,
        ayah=summary.ayah,
        canonical_riwayah_id=summary.canonical_riwayah_id,
        equivalent_riwayah_ids=summary.equivalent_riwayah_ids,
        has_reading_variants=summary.has_reading_variants,
    )


@router.get("/riwayat/{riwayah_id}/equivalent/{surah}/{ayah}", response_model=EquivalentReadingsResponse)
async def get_equivalent_readings_endpoint(riwayah_id: str, surah: int, ayah: int) -> EquivalentReadingsResponse:
    store = get_store()
    if store.get_by_ref(surah, ayah) is None:
        raise HTTPException(status_code=404, detail="Ayah not found")
    result = riwayah_store.get_equivalent_readings(surah, ayah, riwayah_id)
    return EquivalentReadingsResponse(
        surah=result.surah,
        ayah=result.ayah,
        displayed_riwayah_id=result.displayed_riwayah_id,
        equivalent_riwayah_ids=result.equivalent_riwayah_ids,
        comparison_complete=result.comparison_complete,
        note=result.note,
    )


@router.get("/riwayat/{riwayah_id}/symbols", response_model=RiwayahSymbolAvailabilityResponse)
async def get_riwayah_symbols_endpoint(riwayah_id: str) -> RiwayahSymbolAvailabilityResponse:
    result = riwayah_store.get_riwayah_symbols(riwayah_id)
    return RiwayahSymbolAvailabilityResponse(
        riwayah_id=result.riwayah_id,
        symbol_set_id=result.symbol_set_id,
        available=result.available,
    )


@router.get("/riwayat/{riwayah_id}/audio-availability", response_model=AudioAvailabilityResponse)
async def get_audio_availability(riwayah_id: str, reciter_id: str | None = Query(default=None)) -> AudioAvailabilityResponse:
    result = riwayah_store.get_available_audio(riwayah_id, reciter_id)
    return AudioAvailabilityResponse(
        riwayah_id=result.riwayah_id,
        reciter_id=result.reciter_id,
        available=result.available,
        reason=result.reason,
    )
