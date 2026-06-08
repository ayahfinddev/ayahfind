"""English translation lexical scoring with stopword-aware phrase matching."""

from __future__ import annotations

import math
import re
from collections import Counter

from rapidfuzz import fuzz

_WORD = re.compile(r"[a-z']+")

# Ultra-common words excluded from IDF weighting only   not from phrase windows.
_ULTRA_STOP = frozenset(
    {
        "a",
        "an",
        "the",
        "and",
        "or",
        "of",
        "in",
        "to",
        "for",
        "is",
        "it",
        "that",
        "with",
        "on",
        "at",
        "by",
        "as",
        "be",
        "are",
        "was",
        "were",
        "been",
        "has",
        "have",
        "had",
        "do",
        "does",
        "did",
        "will",
        "would",
        "could",
        "should",
        "may",
        "might",
        "must",
        "shall",
        "can",
        "not",
        "no",
        "so",
        "if",
        "but",
        "than",
        "then",
        "there",
        "this",
        "he",
        "she",
        "we",
        "they",
        "them",
        "his",
        "her",
        "its",
        "whom",
        "which",
        "what",
        "when",
        "where",
        "why",
        "how",
    }
)

_PARAPHRASE_REPLACEMENTS = (
    ("ask permission", "seek exemption"),
    ("ask", "seek"),
    ("permission", "exemption"),
    ("of you", "from you"),
    ("upon", "on"),
    ("cause for blame", "blame"),
    # Scene / motion synonyms: "moving like clouds" ↔ "pass as the passing of clouds"
    ("moving like", "pass as"),
    ("move like", "pass as"),
    ("moving", "pass"),
    ("move", "pass"),
    # Comparison word normalisation
    ("like the", "as the"),
    ("like a", "as a"),
    # Oath / swear synonyms
    ("swears by", "swear by"),
    ("swore by", "swear by"),
    # Burden / task synonyms
    ("task a soul", "burden a soul"),
    ("charge a soul", "burden a soul"),
)


def normalize_english(text: str) -> str:
    t = text.lower().strip()
    t = re.sub(r"[^a-z0-9'\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def _paraphrase_hints(text: str) -> str:
    t = text
    for src, dst in _PARAPHRASE_REPLACEMENTS:
        t = t.replace(src, dst)
    return t


def english_content_tokens(text: str) -> list[str]:
    """Discriminative tokens for IDF weighting (reduced stopword influence)."""
    return [
        w
        for w in _WORD.findall(normalize_english(text))
        if len(w) > 2 and w not in _ULTRA_STOP
    ]


def build_english_idf(rows: list[dict]) -> dict[str, float]:
    df: Counter[str] = Counter()
    docs = 0
    for row in rows:
        trans = row.get("translation_en") or ""
        if not trans:
            continue
        docs += 1
        for tok in set(english_content_tokens(trans)):
            df[tok] += 1
    if docs == 0:
        return {}
    return {t: math.log((docs + 1) / (1 + c)) + 1.0 for t, c in df.items()}


def _token_in_text(word: str, t_words: set[str]) -> bool:
    if word in t_words:
        return True
    if len(word) < 5:
        return False
    return any(fuzz.ratio(word, tw) >= 82 for tw in t_words)


def _content_ngrams(tokens: list[str], n: int) -> list[str]:
    if len(tokens) < n:
        return []
    return [" ".join(tokens[i : i + n]) for i in range(len(tokens) - n + 1)]


def _phrase_window_score(q_norm: str, t_norm: str) -> float:
    """Best sliding-window overlap for distinctive multi-word phrases."""
    words = q_norm.split()
    if len(words) < 4:
        return fuzz.partial_ratio(q_norm, t_norm) / 100.0
    best = 0.0
    for size in (8, 7, 6, 5, 4):
        if len(words) < size:
            continue
        for i in range(len(words) - size + 1):
            window = " ".join(words[i : i + size])
            pr = fuzz.partial_ratio(window, t_norm) / 100.0
            ts = fuzz.token_sort_ratio(window, t_norm) / 100.0
            best = max(best, pr * 0.92, ts * 0.78)
    return best


def cheap_english_overlap(q_tokens: list[str], translation: str) -> float:
    """Fast token overlap for prefilter before full phrase scoring."""
    if not q_tokens:
        return 0.0
    t_words = set(_WORD.findall(normalize_english(translation)))
    if not t_words:
        return 0.0
    hits = sum(1 for w in q_tokens if w in t_words)
    # rare tokens count double in prefilter
    rare_hits = sum(1 for w in q_tokens if w in t_words and len(w) >= 6)
    return (hits + rare_hits * 0.5) / len(q_tokens)


def score_english_translation(
    query: str,
    translation: str,
    idf_map: dict[str, float],
) -> tuple[float, dict]:
    """Score English query against a translation with weighted content overlap."""
    q_norm = normalize_english(query)
    t_norm = normalize_english(translation)
    breakdown: dict = {}
    if not q_norm or not t_norm:
        return 0.0, breakdown
    if q_norm in t_norm:
        return 0.97, {"reason": "phrase_contains"}

    q_para = _paraphrase_hints(q_norm)
    t_para = _paraphrase_hints(t_norm)

    q_tokens = english_content_tokens(q_norm)
    if not q_tokens:
        return 0.0, breakdown

    t_words = set(_WORD.findall(t_norm))
    q_content_str = " ".join(q_tokens)

    matched: list[str] = []
    matched_weight = 0.0
    total_weight = 0.0
    for w in q_tokens:
        wt = idf_map.get(w, 2.0)
        total_weight += wt
        if _token_in_text(w, t_words):
            matched.append(w)
            matched_weight += wt

    weighted_cov = matched_weight / total_weight if total_weight else 0.0

    phrase_window = _phrase_window_score(q_para, t_para)
    content_partial = fuzz.partial_ratio(q_content_str, t_norm) / 100.0
    token_sort = fuzz.token_sort_ratio(q_content_str, t_norm) / 100.0

    bigrams = _content_ngrams(q_tokens, 2)
    bi_hits = sum(1 for bg in bigrams if bg in t_para)
    bi_ratio = bi_hits / len(bigrams) if bigrams else 0.0

    trigrams = _content_ngrams(q_tokens, 3)
    tri_hits = 0
    for tg in trigrams:
        parts = tg.split()
        if all(_token_in_text(p, t_words) for p in parts):
            tri_hits += 1
    tri_ratio = tri_hits / len(trigrams) if trigrams else 0.0

    rare_q = [w for w in q_tokens if idf_map.get(w, 1.0) >= 3.2]
    rare_hits = sum(1 for w in rare_q if _token_in_text(w, t_words))
    rare_ratio = rare_hits / len(rare_q) if rare_q else 0.0

    # Paraphrase coverage: fraction of paraphrase-normalised query tokens present
    # in the paraphrase-normalised translation.  This rewards 27:88 ("pass as the
    # passing of clouds") over 24:43 ("mountains of clouds") for the query
    # "mountains moving like clouds", since "pass" appears in 27:88 but not 24:43.
    _q_para_toks = [w for w in _WORD.findall(q_para) if len(w) > 2 and w not in _ULTRA_STOP]
    _t_para_words = set(_WORD.findall(t_para))
    para_cov = (
        sum(1 for w in _q_para_toks if w in _t_para_words) / len(_q_para_toks)
        if _q_para_toks else 0.0
    )

    full_partial = fuzz.partial_ratio(q_norm, t_norm) / 100.0
    generic_penalty = 1.0
    if full_partial >= 0.48 and phrase_window < 0.55 and weighted_cov < 0.45:
        generic_penalty = 0.58 + 0.42 * max(phrase_window, weighted_cov)
    elif phrase_window < 0.50 and weighted_cov < 0.35:
        generic_penalty = 0.65 + 0.35 * weighted_cov

    score = (
        phrase_window * 0.34
        + weighted_cov * 0.26
        + content_partial * 0.12
        + token_sort * 0.06
        + bi_ratio * 0.07
        + tri_ratio * 0.05
        + rare_ratio * 0.06
        + para_cov * 0.04
    ) * generic_penalty

    # Continuous phrase boost: prefer verses matching the paraphrased query form.
    # rare_ratio rewards matching all discriminative tokens; para_cov rewards
    # matching paraphrase-normalised tokens (e.g. "pass" from "moving").
    if phrase_window >= 0.55:
        score = max(
            score,
            0.58
            + phrase_window * 0.18
            + weighted_cov * 0.10
            + content_partial * 0.06
            + bi_ratio * 0.04
            + rare_ratio * 0.08
            + para_cov * 0.08,
        )
    if phrase_window >= 0.75 and weighted_cov >= 0.45:
        score = max(score, 0.88 + (phrase_window - 0.75) * 0.20 + weighted_cov * 0.06)

    score = min(0.98, max(0.0, score))
    breakdown.update(
        {
            "phrase_window": round(phrase_window, 4),
            "weighted_cov": round(weighted_cov, 4),
            "content_partial": round(content_partial, 4),
            "token_sort": round(token_sort, 4),
            "bigram_ratio": round(bi_ratio, 4),
            "trigram_ratio": round(tri_ratio, 4),
            "rare_ratio": round(rare_ratio, 4),
            "para_cov": round(para_cov, 4),
            "full_partial": round(full_partial, 4),
            "generic_penalty": round(generic_penalty, 4),
            "matched_tokens": matched[:12],
            "token_weights": {w: round(idf_map.get(w, 2.0), 3) for w in q_tokens[:12]},
            "final_score": round(score, 4),
        }
    )
    return score, breakdown
