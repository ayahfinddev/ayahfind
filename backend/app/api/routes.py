"""FastAPI route handlers."""

from __future__ import annotations

import asyncio
import logging
import tempfile
import time
import traceback
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import JSONResponse

from app.api.diagnostics import build_debug_search_payload, build_health_payload
from app.api.errors import search_error_response, search_response_or_error
from app.core.config import get_settings
from app.models.schemas import (
    AyahDetail,
    ReaderSurahResponse,
    SearchRequest,
    SearchResponse,
)
from app.services.quran_store import QuranStore
from app.services.search_service import SearchService

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
