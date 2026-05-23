"""Retrieval diagnostics helpers for unified search."""

from __future__ import annotations

from app.core.arabic_text import normalize_arabic
from app.core.config import Settings, get_settings
from app.core.phonetic import detect_script, encode_query_phonetic
from app.services.lexical_search import LexicalSearchEngine


def build_retrieval_diagnostics(query: str, settings: Settings | None = None, top_k: int = 8) -> dict:
    settings = settings or get_settings()
    q = query.strip()
    script = detect_script(q)
    primary, latin = encode_query_phonetic(q)
    out: dict = {
        "raw_query": q,
        "script": script,
        "normalized_arabic": normalize_arabic(q) if script == "arabic" else None,
        "phonetic_primary": primary,
        "phonetic_latin": latin,
    }
    lex = LexicalSearchEngine(settings)
    pre = lex.search(q, top_k=top_k)
    out["lexical_candidates"] = [{"ayah_id": aid, "score": round(sc, 4)} for aid, sc in pre[:top_k]]
    out["lexical_trace"] = dict(lex.last_trace)
    return out
