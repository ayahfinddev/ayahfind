"""Thematic (concept) scoring for meaning-first search."""

from __future__ import annotations

import re
from typing import Protocol

from dataclasses import dataclass

from app.core.thematic_lexicon import (
    THEME_EXCLUSIONS,
    THEMES,
    Theme,
    expanded_keywords,
    match_themes,
    theme_label_for_query,
)

_WORD = re.compile(r"[a-z']+")


class _ThematicDoc(Protocol):
    surah: int
    ayah: int
    translation_en: str
    transliteration: str
    transliteration_normalized: str


def _tokens(text: str) -> list[str]:
    return _WORD.findall(text.lower())


def passes_theme_exclusions(translation: str, themes: list[Theme]) -> bool:
    """Reject verses whose translation strongly signals opposite/contradictory themes."""
    trans = translation.lower()
    for theme in themes:
        for excl in THEME_EXCLUSIONS.get(theme.id, ()):
            if re.search(rf"\b{re.escape(excl.lower())}\b", trans):
                return False
    return True


def _keyword_hit(keyword: str, translation: str, transliteration: str) -> bool:
    kl = keyword.lower()
    if len(kl) < 3:
        return False
    word_pat = re.compile(rf"\b{re.escape(kl)}\b", re.I)
    if word_pat.search(translation):
        return True
    if word_pat.search(transliteration):
        return True
    if len(kl) >= 4:
        stem = kl[:4]
        for w in _tokens(translation):
            if w.startswith(stem) and not w.startswith("un" + stem[:2]):
                return True
        for w in transliteration.split():
            if w.startswith(stem):
                return True
    return False


def score_thematic_row(
    query: str,
    doc: _ThematicDoc,
    themes: list[Theme] | None = None,
) -> tuple[float, str, list[Theme]]:
    themes = themes or match_themes(query)
    if not themes:
        return 0.0, "no_theme", []

    trans = (doc.translation_en or "").lower()
    trans_lit = (getattr(doc, "transliteration_normalized", None) or doc.transliteration or "").lower()

    is_anchor = any(
        doc.surah == s and doc.ayah == a for theme in themes for s, a in theme.anchors
    )
    if not is_anchor and not passes_theme_exclusions(trans, themes):
        return 0.0, "thematic_excluded", themes

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
        if re.search(r"\bgrateful\b", trans) or re.search(r"\bgratitude\b", trans):
            score = max(score, 0.82)

    score = min(0.94, score)
    reason = f"thematic|{themes[0].id}|hits={','.join(sorted(set(hits))[:6])}"
    return score, reason, themes


def score_thematic(query: str, doc) -> tuple[float, str, list[Theme]]:
    return score_thematic_row(query, doc)


def is_concept_style_query(query: str, search_type: str) -> bool:
    return bool(match_themes(query))


@dataclass(frozen=True)
class ThemeDoc:
    surah: int
    ayah: int
    translation_en: str
    transliteration: str = ""
    transliteration_normalized: str = ""


def theme_intent_hint(query: str) -> str | None:
    label = theme_label_for_query(query)
    if not label:
        return None
    return f"Meaning search · {label}"


def anchor_scores(themes: list[Theme]) -> dict[tuple[int, int], float]:
    scores: dict[tuple[int, int], float] = {}
    theme_by_id = {t.id: t for t in THEMES}
    for tid in {t.id for t in themes}:
        theme = theme_by_id.get(tid)
        if not theme:
            continue
        for i, ref in enumerate(theme.anchors):
            scores[ref] = max(scores.get(ref, 0.0), min(0.97, 0.93 + (len(theme.anchors) - i) * 0.015))
    return scores


def keyword_candidate_ids(
    rows: list[dict],
    themes: list[Theme],
    *,
    max_scan: int = 1200,
) -> list[int]:
    keywords = expanded_keywords(themes)
    if not keywords:
        return []
    patterns = [re.compile(rf"\b{re.escape(kw)}\b", re.I) for kw in keywords if len(kw) >= 3]
    if not patterns:
        return []

    hits: list[int] = []
    for row in rows[:max_scan]:
        trans = (row.get("translation_en") or "").lower()
        if not trans or not passes_theme_exclusions(trans, themes):
            continue
        if any(p.search(trans) for p in patterns):
            hits.append(int(row["id"]))
    return hits


def score_rows_for_themes(
    query: str,
    rows_by_id: dict[int, dict],
    candidate_ids: list[int],
    themes: list[Theme],
) -> list[tuple[int, float, str]]:
    anchor_map = anchor_scores(themes)
    scored: list[tuple[int, float, str]] = []

    for aid in candidate_ids:
        row = rows_by_id.get(aid)
        if not row:
            continue
        s = int(row.get("surah_number", row.get("surah", 0)))
        a = int(row.get("ayah_number", row.get("ayah", 0)))
        doc = ThemeDoc(
            surah=s,
            ayah=a,
            translation_en=row.get("translation_en") or "",
            transliteration=row.get("transliteration") or "",
            transliteration_normalized=row.get("transliteration_normalized") or "",
        )
        ref = (s, a)
        if ref in anchor_map:
            scored.append((aid, anchor_map[ref], f"thematic_anchor|{themes[0].id}"))
            continue
        th_score, reason, _ = score_thematic_row(query, doc, themes)
        if th_score >= 0.52:
            scored.append((aid, th_score, reason))

    return scored
