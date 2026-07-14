"""
Concept/synonym expansions for meaning-first English search.

Data-driven: concept definitions live in concept_lexicon.json, not in this
file, so adding concept coverage doesn't require touching code. This module
only loads that data and exposes the same Theme/match_themes/etc. interface
consumers (thematic_search.py, search_service.py) already depend on.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

_LEXICON_PATH = Path(__file__).resolve().parent / "concept_lexicon.json"


@dataclass(frozen=True)
class Theme:
    id: str
    label: str
    aliases: tuple[str, ...]
    keywords: tuple[str, ...]
    anchors: tuple[tuple[int, int], ...] = ()


def _load_themes(path: Path) -> tuple[Theme, ...]:
    data = json.loads(path.read_text(encoding="utf-8"))
    themes = []
    for c in data["concepts"]:
        themes.append(
            Theme(
                id=c["id"],
                label=c["label"],
                aliases=tuple(c["aliases"]),
                keywords=tuple(c["keywords"]),
                anchors=tuple((int(s), int(a)) for s, a in c.get("anchors", [])),
            )
        )
    return tuple(themes)


def _load_exclusions(path: Path) -> dict[str, tuple[str, ...]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return {c["id"]: tuple(c.get("exclusions", [])) for c in data["concepts"]}


THEMES: tuple[Theme, ...] = _load_themes(_LEXICON_PATH)

# Substrings that disqualify a verse for a positive theme (precision over recall).
THEME_EXCLUSIONS: dict[str, tuple[str, ...]] = _load_exclusions(_LEXICON_PATH)

_ALIAS_TO_THEME: dict[str, Theme] = {}


def _register() -> None:
    for theme in THEMES:
        for alias in theme.aliases:
            _ALIAS_TO_THEME[alias.lower()] = theme


_register()


def match_themes(query: str) -> list[Theme]:
    q = query.lower().strip()
    if not q:
        return []
    found: dict[str, Theme] = {}
    tokens = [t for t in re.findall(r"[a-z']+", q) if len(t) > 2]
    for token in tokens:
        if token in _ALIAS_TO_THEME:
            found[_ALIAS_TO_THEME[token].id] = _ALIAS_TO_THEME[token]
    if q in _ALIAS_TO_THEME:
        found[_ALIAS_TO_THEME[q].id] = _ALIAS_TO_THEME[q]
    return list(found.values())


def expanded_keywords(themes: list[Theme]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for theme in themes:
        for kw in theme.keywords:
            kl = kw.lower()
            if kl not in seen:
                seen.add(kl)
                out.append(kl)
    return out


def known_aliases() -> frozenset[str]:
    """All concept trigger words/phrases across the lexicon.

    Used by typo_correction to avoid "correcting" a correctly-spelled but
    corpus-rare concept word into an unrelated near-neighbor (e.g. the
    deliberately curated "sadness" was being edit-distance-corrected to
    "madness" since it doesn't appear literally in any translation_en text).
    """
    return frozenset(_ALIAS_TO_THEME.keys())


def theme_label_for_query(query: str) -> str | None:
    themes = match_themes(query)
    if not themes:
        return None
    if len(themes) == 1:
        return themes[0].label
    return " / ".join(t.label for t in themes[:3])
