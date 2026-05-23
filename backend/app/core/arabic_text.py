"""Arabic normalization and Latin transliteration generation."""

from __future__ import annotations

import re
import unicodedata

from app.core.transliteration import normalize_transliteration

_TASHKEEL = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]")
_NON_ARABIC = re.compile(r"[^\u0600-\u06FF\s]")

_AR_NORMALIZE = str.maketrans(
    {
        "\u0622": "\u0627",
        "\u0623": "\u0627",
        "\u0625": "\u0627",
        "\u0621": "",
        "\u0671": "\u0627",
        "\u0629": "\u0647",
        "\u0649": "\u064A",
        "\u06CC": "\u064A",
    }
)

# Arabic letter -> Latin (readable transliteration)
_LATIN_MAP = {
    "\u0621": "",
    "\u0622": "a",
    "\u0623": "a",
    "\u0624": "u",
    "\u0625": "a",
    "\u0626": "a",
    "\u0627": "a",
    "\u0628": "b",
    "\u0629": "h",
    "\u062A": "t",
    "\u062B": "th",
    "\u062C": "j",
    "\u062D": "h",
    "\u062E": "kh",
    "\u062F": "d",
    "\u0630": "dh",
    "\u0631": "r",
    "\u0632": "z",
    "\u0633": "s",
    "\u0634": "sh",
    "\u0635": "s",
    "\u0636": "d",
    "\u0637": "t",
    "\u0638": "z",
    "\u0639": "a",
    "\u063A": "gh",
    "\u0640": "",  # tatweel
    "\u0641": "f",
    "\u0642": "q",
    "\u0643": "k",
    "\u0644": "l",
    "\u0645": "m",
    "\u0646": "n",
    "\u0647": "h",
    "\u0648": "w",
    "\u0649": "a",
    "\u064A": "y",
    "\u0671": "a",
}


def normalize_arabic(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)
    text = _TASHKEEL.sub("", text)
    text = text.translate(_AR_NORMALIZE)
    text = _NON_ARABIC.sub("", text)
    return " ".join(text.split())


def arabic_to_latin_transliteration(text_ar: str) -> str:
    """Generate simple readable transliteration from Arabic ayah text."""
    normalized = normalize_arabic(text_ar)
    parts: list[str] = []
    for ch in normalized:
        if ch == " ":
            parts.append(" ")
        elif ch in _LATIN_MAP:
            parts.append(_LATIN_MAP[ch])
    latin = "".join(parts)
    latin = re.sub(r"\s+", " ", latin).strip()
    return latin


def prepare_transliteration_fields(text_ar: str, api_translit: str | None = None) -> tuple[str, str]:
    """
    Returns (transliteration_simple, transliteration_normalized).
    Prefer API transliteration when available.
    """
    simple = (api_translit or "").strip() or arabic_to_latin_transliteration(text_ar)
    return simple, normalize_transliteration(simple)
