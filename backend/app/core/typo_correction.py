"""Query-time typo correction using corpus vocabulary and edit distance."""

from __future__ import annotations

import logging
import re
from functools import lru_cache

from rapidfuzz import fuzz, process
from rapidfuzz.distance import DamerauLevenshtein

from app.core.english_lexical_scoring import _ULTRA_STOP, normalize_english
from app.core.thematic_lexicon import known_aliases

logger = logging.getLogger("ayahfind.typo")

_WORD_RE = re.compile(r"[a-z']+")

_vocab_set: set[str] | None = None
_vocab_list: list[str] | None = None


def _build_vocab(rows: list[dict]) -> None:
    global _vocab_set, _vocab_list
    if _vocab_set is not None:
        return
    words: set[str] = set()
    for row in rows:
        trans = row.get("translation_en") or ""
        for w in _WORD_RE.findall(trans.lower()):
            if len(w) > 2 and w not in _ULTRA_STOP:
                words.add(w)
    _vocab_set = words
    _vocab_list = sorted(words)


def known_english_vocab(rows: list[dict]) -> frozenset[str]:
    """Corpus-derived English vocabulary (translation_en word set).

    Shared with classify_query's transliteration detection: a query being
    short and containing no recognized *marker* word doesn't mean it's
    transliterated Arabic — it might just use vocabulary outside the
    curated marker list (e.g. "Allah expands provision"). Checking against
    real corpus vocabulary is a general, scalable way to tell the two apart
    without hand-listing exceptions.
    """
    _build_vocab(rows)
    return frozenset(_vocab_set or ())


def _best_correction(word: str) -> str | None:
    """Find the best vocabulary match for a misspelled word."""
    if _vocab_set is None or _vocab_list is None:
        return None
    if word in _vocab_set:
        return None

    max_dist = 1 if len(word) <= 4 else 2

    candidates: list[tuple[str, int]] = []
    for vocab_word in _vocab_list:
        if abs(len(vocab_word) - len(word)) > max_dist:
            continue
        dist = DamerauLevenshtein.distance(word, vocab_word)
        if dist <= max_dist:
            candidates.append((vocab_word, dist))

    if not candidates:
        return None

    candidates.sort(key=lambda x: (x[1], -len(x[0])))
    return candidates[0][0]


def correct_query(query: str, rows: list[dict]) -> tuple[str, str | None]:
    """
    Correct typos in an English query using corpus vocabulary.

    Returns (corrected_query, corrected_form_or_None).
    If no corrections were made, corrected_form is None.
    """
    _build_vocab(rows)
    q_norm = normalize_english(query)
    words = q_norm.split()
    if not words:
        return query, None

    concept_vocab = known_aliases()
    corrected = []
    changed = False
    for w in words:
        if (
            len(w) <= 2
            or w in _ULTRA_STOP
            or (_vocab_set and w in _vocab_set)
            or w in concept_vocab
        ):
            corrected.append(w)
            continue
        fix = _best_correction(w)
        if fix and fix != w:
            logger.info("typo_correction %r -> %r", w, fix)
            corrected.append(fix)
            changed = True
        else:
            corrected.append(w)

    if not changed:
        return query, None

    corrected_query = " ".join(corrected)
    return corrected_query, corrected_query
