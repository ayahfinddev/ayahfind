"""
Lightweight concept -> keyword expansions for meaning-first English search.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass(frozen=True)
class Theme:
    id: str
    label: str
    aliases: tuple[str, ...]
    keywords: tuple[str, ...]
    anchors: tuple[tuple[int, int], ...] = ()


THEMES: tuple[Theme, ...] = (
    Theme(
        "patience",
        "Patience (sabr)",
        ("patience", "patient", "sabr", "perseverance", "steadfast", "endure"),
        (
            "patient", "patience", "persevere", "steadfast", "endure", "sabr",
            "trial", "hardship", "afflict", "adversity", "bear",
        ),
        ((2, 153), (2, 155), (3, 200), (103, 3)),
    ),
    Theme(
        "gratitude",
        "Gratitude (shukr)",
        ("gratitude", "grateful", "thankful", "thanks", "shukr"),
        (
            "grateful", "gratitude", "thank", "thanks", "thankful", "shukr",
            "blessing", "blessings", "favor", "increase",
        ),
        ((14, 7), (2, 152), (31, 12)),
    ),
    Theme(
        "mercy",
        "Mercy (rahma)",
        ("mercy", "merciful", "compassion", "rahma", "rahim"),
        (
            "mercy", "merciful", "compassion", "compassionate", "kind", "kindness",
            "forgive", "rahma", "rahim", "beneficent",
        ),
        ((1, 1), (7, 156)),
    ),
    Theme(
        "forgiveness",
        "Forgiveness",
        ("forgiveness", "forgive", "pardon", "repent", "repentance"),
        (
            "forgive", "forgave", "forgiveness", "pardon", "repent", "repentance",
            "sin", "sins",
        ),
        ((39, 53), (3, 135)),
    ),
    Theme(
        "trust",
        "Trust in Allah",
        ("trust", "tawakkul", "rely", "reliance", "depend"),
        ("trust", "rely", "relied", "depend", "sufficient", "guardian", "protector"),
        ((3, 159), (65, 3)),
    ),
    Theme(
        "hardship_ease",
        "Hardship and ease",
        ("hardship", "ease", "relief", "trial", "trials"),
        (
            "hardship", "difficulty", "ease", "relief", "trial", "trials", "afflict",
            "burden", "usri", "yusra",
        ),
        ((94, 5), (94, 6), (2, 286)),
    ),
    Theme(
        "charity",
        "Charity",
        ("charity", "give", "zakat", "sadaqah", "poor", "needy"),
        ("charity", "give", "gave", "poor", "needy", "orphan", "spend", "wealth"),
        ((2, 261), (107, 7)),
    ),
    Theme(
        "prayer",
        "Prayer",
        ("prayer", "pray", "salah", "salat", "worship"),
        ("prayer", "pray", "prostrat", "bow", "worship", "salah", "salat"),
        ((2, 238), (20, 14)),
    ),
)

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
        for alias, theme in _ALIAS_TO_THEME.items():
            if len(alias) >= 4 and len(token) >= 4:
                if token.startswith(alias[:4]) or alias.startswith(token[:4]):
                    found[theme.id] = theme
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


def theme_label_for_query(query: str) -> str | None:
    themes = match_themes(query)
    if not themes:
        return None
    if len(themes) == 1:
        return themes[0].label
    return " / ".join(t.label for t in themes[:3])