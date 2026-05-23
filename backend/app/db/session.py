"""Async database session factory."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings, get_settings
from app.db.models import Base

_engine = None
_session_factory = None


def get_engine(settings: Settings | None = None):
    global _engine
    if _engine is None:
        s = settings or get_settings()
        _engine = create_async_engine(s.database_url, echo=False)
    return _engine


def get_session_factory(settings: Settings | None = None) -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(get_engine(settings), expire_on_commit=False)
    return _session_factory


async def init_db(settings: Settings | None = None) -> None:
    engine = get_engine(settings)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    factory = get_session_factory()
    async with factory() as session:
        yield session
