"""Phonetic / transliteration normalization for error-tolerant Qur'an search."""

from __future__ import annotations

import re
import unicodedata

from rapidfuzz import fuzz

_TASHKEEL = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]")
_NON_ARABIC = re.compile(r"[^\u0600-\u06FF\s]")

_AR_NORMALIZE = str.maketrans(
    {
        "\u0622": "\u0627",
        "\u0623": "\u0627",
        "\u0625": "\u0627",
        "\u0671": "\u0627",
        "\u0629": "\u0647",
        "\u0649": "\u064A",
        "\u06CC": "\u064A",
        "\u0629": "\u0647",
        "\u0629": "\u0647",
    }
)

_LATIN_REPLACEMENTS = [
    (r"ph", "f"),
    (r"kh", "h"),
    (r"gh", "g"),
    (r"sh", "s"),
    (r"th", "t"),
    (r"dh", "d"),
    (r"aa", "a"),
    (r"ee", "i"),
    (r"oo", "u"),
    (r"ou", "u"),
    (r"ei", "i"),
    (r"ai", "a"),
    (r"al-", "al "),
    (r"^al ", ""),
    (r"^an ", ""),
    (r"^ar ", ""),
    (r"^as ", ""),
    (r"^at ", ""),
    (r"^ad ", ""),
    (r"^az ", ""),
]

_STOPWORDS = frozenset(
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
        "from",
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
        "yes",
        "so",
        "if",
        "but",
        "than",
        "then",
        "there",
        "their",
        "they",
        "them",
        "this",
        "these",
        "those",
        "he",
        "she",
        "we",
        "you",
        "your",
        "our",
        "his",
        "her",
        "its",
        "who",
        "whom",
        "which",
        "what",
        "when",
        "where",
        "why",
        "how",
        "all",
        "any",
        "each",
        "few",
        "more",
        "most",
        "other",
        "some",
        "such",
        "only",
        "own",
        "same",
        "too",
        "very",
        "just",
        "also",
        "now",
        "here",
        "wa",
        "fa",
        "la",
        "li",
        "bi",
        "fi",
        "min",
        "ila",
        "inna",
        "anna",
        "alla",
        "allahu",
        "allah",
        "huwa",
        "hiya",
        "hum",
        "hunna",
        "antum",
        "antunna",
        "ana",
        "nahnu",
    }
)


def strip_tashkeel(text: str) -> str:
    return _TASHKEEL.sub("", text)


def normalize_arabic_for_detect(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = strip_tashkeel(text)
    text = text.translate(_AR_NORMALIZE)
    text = _NON_ARABIC.sub("", text)
    return " ".join(text.split())


def normalize_transliteration(text: str) -> str:
    t = text.lower().strip()
    t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    for pattern, repl in _LATIN_REPLACEMENTS:
        t = re.sub(pattern, repl, t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def content_tokens(text_norm: str) -> list[str]:
    return [w for w in text_norm.split() if len(w) > 2 and w not in _STOPWORDS]


def phrase_similarity(query_norm: str, doc_norm: str) -> tuple[float, str]:
    if not query_norm or not doc_norm:
        return 0.0, "empty"
    if query_norm in doc_norm:
        return 0.97, "phrase_contains"
    partial = fuzz.partial_ratio(query_norm, doc_norm) / 100.0
    token_sort = fuzz.token_sort_ratio(query_norm, doc_norm) / 100.0
    token_set = fuzz.token_set_ratio(query_norm, doc_norm) / 100.0
    q_tokens = content_tokens(query_norm)
    if len(q_tokens) >= 3:
        score = max(partial * 0.92, token_sort * 0.88, token_set * 0.55)
        reason = "phrase_multi_token"
    elif len(q_tokens) >= 2:
        score = max(partial * 0.9, token_sort * 0.82, token_set * 0.5)
        reason = "phrase_dual_token"
    else:
        score = partial * 0.75
        reason = "phrase_short"
    return min(0.98, score), reason


def detect_script(query: str) -> str:
    arabic_chars = sum(1 for c in query if "\u0600" <= c <= "\u06FF")
    if arabic_chars > len(query) * 0.3:
        return "arabic"
    return "latin"


_ENGLISH_MARKERS = re.compile(
    r"\b(the|not|don't|dont|do|does|did|approach|burden|soul|meaning|verse|ayah|god|lord|say|said|people|man|woman|forbidden|sin|mercy|pray|prayer|worship|help|world|hereafter|paradise|hell|book|chapter|surah)\b",
    re.I,
)


def detect_search_type(query: str) -> str:
    if detect_script(query) == "arabic":
        return "arabic"
    q = query.lower().strip()
    latin_letters = sum(1 for c in q if "a" <= c <= "z")
    if latin_letters < 3:
        return "english"
    words = [w for w in re.sub(r"[^a-z\s]", " ", q).split() if w]
    if re.search(
        r"\b(wa|fa)\s+(la|ma|bi|li|fi)\s+",
        q,
    ) or re.search(
        r"\b(taqrabu|yukallifu|iyyaka|huwallahu|huwa|qul|ahad|allahu|allah|iyyaka|ayahsabu|insanu|rabbana)\b",
        q,
    ):
        return "transliteration"
    if _ENGLISH_MARKERS.search(q):
        return "english"
    # Transliteration cues before English stopword heuristics (huwa/allahu are stopwords but phonetic)
    if re.search(
        r"\b(al|an|ar|as|at|ad|az|wa|fa|la|huwa|huwallahu|iyyaka|yukallifu|taqrabu|ayahsabu|insanu|rabbana|qul|ahad|allahu)\b",
        q,
    ):
        return "transliteration"
    if words:
        en_stop = sum(1 for w in words if w in _STOPWORDS)
        if en_stop >= 2 or (len(words) >= 3 and en_stop / len(words) >= 0.34):
            return "english"
    if len(words) <= 8 and latin_letters / max(len(q), 1) > 0.75:
        # Short Latin-only strings without English markers → likely phonetic ayah recall
        return "transliteration"
    return "english"
