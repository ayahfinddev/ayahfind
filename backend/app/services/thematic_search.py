"""Thematic (concept) scoring for meaning-first search."""

from __future__ import annotations

import re

from app.core.thematic_lexicon import Theme, expanded_keywords, match_themes

_WORD = re.compile(r"[a-z']+")


def _tokens(text: str) -> list[str]:
    return _WORD.findall(text.lower())


def _keyword_hit(keyword: str, translation: str, transliteration: str) -> bool:
    kl = keyword.lower()
    if kl in translation or kl in transliteration:
        return True
    if len(kl) >= 4:
        stem = kl[:4]
        for w in _tokens(translation):
            if w.startswith(stem):
                return True
        for w in transliteration.split():
            if w.startswith(stem):
                return True
    return False


def score_thematic(query: str, doc) -> tuple[float, str, list[Theme]]:
    themes = match_themes(query)
    if not themes:
        return 0.0, "no_theme", []

    trans = (doc.translation_en or "").lower()
    trans_lit = (doc.transliteration_normalized or "").lower()
    keywords = expanded_keywords(themes)

    hits: list[str] = []
    for kw in keywords:
        if _keyword_hit(kw, trans, trans_lit):
            hits.append(kw)

    if not hits:
        return 0.0, "thematic_no_hits", themes

    unique_hits = len(set(hits))
    density = min(1.0, unique_hits / max(3, min(8, len(keywords) // 4)))
    score = 0.42 + density * 0.38 + min(0.12, unique_hits * 0.03)

    for theme in themes:
        for i, (s, a) in enumerate(theme.anchors):
            if doc.surah == s and doc.ayah == a:
                score = max(score, 0.93 + (len(theme.anchors) - i) * 0.015)

    q_lower = query.lower()
    if "patient" in q_lower or "patience" in q_lower:
        if re.search(r"\bpatient\b", trans):
            score = max(score, 0.82)
    if "grateful" in q_lower or "gratitude" in q_lower:
        if "grateful" in trans or "gratitude" in trans:
            score = max(score, 0.82)

    score = min(0.94, score)
    reason = f"thematic|{themes[0].id}|hits={','.join(sorted(set(hits))[:6])}"
    return score, reason, themes


def is_concept_style_query(query: str, search_type: str) -> bool:
    return bool(match_themes(query))