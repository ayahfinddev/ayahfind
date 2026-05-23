"""AyahFind API Gateway."""

from __future__ import annotations

import logging
import time
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.diagnostics import build_debug_search_payload, build_health_payload
from app.api.routes import get_search, router
from app.core.config import REPO_ROOT, get_settings
from app.db.session import init_db
from app.services.quran_store import QuranStore
from app.services.vector_search import SemanticVectorSearch

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("ayahfind.startup")


def _corpus_status(settings) -> dict:
    processed = settings.processed_dir / "ayahs_processed.json"
    semantic_idx = settings.vector_index_dir / "semantic.faiss"
    semantic_map = settings.vector_index_dir / "semantic_id_map.json"
    return {
        "repo_root": str(REPO_ROOT),
        "processed_path": str(processed),
        "processed_exists": processed.exists(),
        "processed_bytes": processed.stat().st_size if processed.exists() else 0,
        "semantic_index": semantic_idx.exists() and semantic_map.exists(),
        "vector_index_dir": str(settings.vector_index_dir),
        "use_database": settings.use_database,
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    startup_errors: list[str] = []
    app.state.startup_errors = startup_errors

    for d in (settings.processed_dir, settings.vector_index_dir, settings.audio_dir):
        d.mkdir(parents=True, exist_ok=True)

    status = _corpus_status(settings)
    logger.info("AyahFind startup paths: %s", status)

    if not status["processed_exists"] or status["processed_bytes"] < 50_000:
        msg = f"Processed corpus missing or too small at {status['processed_path']}"
        logger.error(msg)
        startup_errors.append(msg)

    if settings.use_database:
        try:
            await init_db(settings)
        except Exception as e:
            logger.warning("Database init skipped/failed: %s", e)
            startup_errors.append(f"database_init: {e}")

    try:
        store = QuranStore(settings)
        await store.aload()
        ayah_count = len(store.ayahs)
        app.state.ayah_count = ayah_count
        app.state.corpus_status = status

        if ayah_count == 0:
            startup_errors.append("loaded 0 ayahs")
            logger.error("Startup loaded 0 ayahs — verify data volume and AYAHFIND_ROOT")
        else:
            logger.info("AyahFind ready: %s ayahs loaded", ayah_count)
    except Exception as e:
        app.state.ayah_count = 0
        startup_errors.append(f"corpus_load: {e}")
        logger.exception("Failed to load Quran store")

    if status["semantic_index"]:
        try:
            SemanticVectorSearch(settings).load()
            logger.info("Semantic FAISS index preloaded")
        except Exception as e:
            logger.warning("Semantic index preload failed: %s", e)
            startup_errors.append(f"semantic_preload: {e}")
    else:
        logger.info("Semantic FAISS index not present — lexical/phonetic only")

    try:
        get_search()._store.load()
        logger.info("SearchService warmed")
    except Exception as e:
        logger.warning("SearchService warm failed: %s", e)
        startup_errors.append(f"search_warm: {e}")

    yield


class RequestLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        t0 = time.perf_counter()
        try:
            response = await call_next(request)
            ms = round((time.perf_counter() - t0) * 1000, 1)
            logger.info(
                "http %s %s status=%s duration_ms=%s",
                request.method,
                request.url.path,
                response.status_code,
                ms,
            )
            return response
        except Exception:
            logger.exception("http_unhandled %s %s", request.method, request.url.path)
            return JSONResponse(
                status_code=503,
                content={"error": "internal_error", "details": "Request failed"},
            )


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        description="Human-error-tolerant Islamic retrieval engine",
        version="0.2.0",
        lifespan=lifespan,
    )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(
            "unhandled_exception path=%s\n%s",
            request.url.path,
            traceback.format_exc(),
        )
        return JSONResponse(
            status_code=503,
            content={"error": "internal_error", "details": str(exc)[:300]},
        )

    app.add_middleware(RequestLogMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def root_health(request: Request) -> dict:
        return build_health_payload(request)

    @app.get("/debug-search")
    async def root_debug_search(
        request: Request,
        q: str = Query(default="qul huwa allahu ahad", max_length=500),
        top_k: int = Query(default=3, ge=1, le=10),
    ) -> dict:
        return build_debug_search_payload(request, query=q, top_k=top_k)

    app.include_router(router, prefix=settings.api_prefix)

    web_dir = REPO_ROOT / "frontend" / "web"
    if web_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(web_dir)), name="assets")

        @app.get("/")
        async def web_ui():
            return FileResponse(web_dir / "index.html")

    return app


app = create_app()
