"""
Phonetic encoding for error-tolerant Qur'an search.

Maps Arabic and Latin transliteration to comparable phonetic keys.
Designed for weak tajweed, missing diacritics, and inconsistent transliteration.
"""

from __future__ import annotations

import re
import unicodedata

# Arabic diacritics (tashkeel) and optional marks
_TASHKEEL = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]")
# Non-Arabic letters to strip in phonetic pass
_NON_ARABIC = re.compile(r"[^\u0600-\u06FF\s]")

# Normalize common alef / ya / ta variants for matching
_AR_NORMALIZE = str.maketrans(
    {
        "\u0622": "\u0627",  # alef madda
        "\u0623": "\u0627",  # alef hamza above
        "\u0625": "\u0627",  # alef hamza below
        "\u0671": "\u0627",  # alef wasla
        "\u0629": "\u0647",  # ta marbuta -> ha
        "\u0649": "\u064A",  # alef maksura -> ya
        "\u06CC": "\u064A",  # Farsi yeh
    }
)

# Buckwalter-inspired Arabic -> Latin phoneme skeleton
_BUCKWALTER = str.maketrans(
    "ءآأؤإئابةتثجحخدذرزسشصضطظعغفقكلمنهوىي",
    "oaa'w'ibpthjhkhdrzss'dt'g'fqklmnhwyy",
)

# Latin transliteration noise: collapse common user variants
_LATIN_REPLACEMENTS = [
    (r"[''`]", ""),
    (r"ph", "f"),
    (r"kh", "x"),
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
    (r"el-", "al "),
    (r"ul-", "al "),
]


def strip_tashkeel(text: str) -> str:
    return _TASHKEEL.sub("", text)


def normalize_arabic(text: str) -> str:
    from app.core.arabic_text import normalize_arabic as _norm

    return _norm(text)


def arabic_to_phonetic_primary(text: str) -> str:
    """Phonetic key from Arabic script (consonant skeleton)."""
    normalized = normalize_arabic(text)
    latin = normalized.translate(_BUCKWALTER)
    # remove vowel letters for skeleton matching (imperfect recitation tolerance)
    skeleton = re.sub(r"[aeiou]", "", latin)
    return re.sub(r"\s+", " ", skeleton).strip().lower()


def latin_to_phonetic_latin(text: str) -> str:
    """Phonetic key from user transliteration / mispronunciation."""
    t = text.lower().strip()
    t = unicodedata.normalize("NFKD", t)
    t = "".join(c for c in t if not unicodedata.combining(c))
    for pattern, repl in _LATIN_REPLACEMENTS:
        t = re.sub(pattern, repl, t)
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    # consonant skeleton
    skeleton = re.sub(r"[aeiou]", "", t)
    return re.sub(r"\s+", " ", skeleton).strip()


def detect_script(query: str) -> str:
    arabic_chars = sum(1 for c in query if "\u0600" <= c <= "\u06FF")
    if arabic_chars > len(query) * 0.3:
        return "arabic"
    return "latin"


def encode_query_phonetic(query: str) -> tuple[str, str]:
    """
    Returns (primary_key, latin_key) for dual-path matching.
    """
    script = detect_script(query)
    if script == "arabic":
        primary = arabic_to_phonetic_primary(query)
        latin = latin_to_phonetic_latin(
            query.translate(_BUCKWALTER) if any("\u0600" <= c <= "\u06FF" for c in query) else query
        )
    else:
        latin = latin_to_phonetic_latin(query)
        primary = latin  # fallback when no Arabic in query
    return primary, latin
