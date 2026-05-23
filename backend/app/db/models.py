"""SQLAlchemy ORM models."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.dialects.sqlite import JSON as SQLiteJSON
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Surah(Base):
    __tablename__ = "surahs"

    number: Mapped[int] = mapped_column(SmallInteger, primary_key=True)
    name_ar: Mapped[str] = mapped_column(String(128))
    name_en: Mapped[str] = mapped_column(String(128))
    revelation_type: Mapped[str] = mapped_column(String(16))
    ayah_count: Mapped[int] = mapped_column(SmallInteger)

    ayahs: Mapped[list["Ayah"]] = relationship(back_populates="surah")


class Ayah(Base):
    __tablename__ = "ayahs"
    __table_args__ = (UniqueConstraint("surah_number", "ayah_number"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    surah_number: Mapped[int] = mapped_column(SmallInteger, ForeignKey("surahs.number"))
    ayah_number: Mapped[int] = mapped_column(SmallInteger)
    text_ar: Mapped[str] = mapped_column(Text)
    transliteration: Mapped[str | None] = mapped_column(Text, default="")
    translation_en: Mapped[str | None] = mapped_column(Text, default="")
    phonetic_primary: Mapped[str | None] = mapped_column(Text, default="")
    phonetic_latin: Mapped[str | None] = mapped_column(Text, default="")
    root_words: Mapped[list] = mapped_column(SQLiteJSON, default=list)
    faiss_semantic_id: Mapped[int | None] = mapped_column(Integer)
    popularity_score: Mapped[float] = mapped_column(Float, default=0.0)
    audio_url: Mapped[str | None] = mapped_column(Text)
    mfcc_offset: Mapped[int | None] = mapped_column(Integer)  # index into mfcc bank

    surah: Mapped[Surah] = relationship(back_populates="ayahs")


class IndexRun(Base):
    __tablename__ = "index_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    pipeline_name: Mapped[str] = mapped_column(String(64))
    version: Mapped[str] = mapped_column(String(32))
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(16), default="running")
    records_processed: Mapped[int] = mapped_column(Integer, default=0)
