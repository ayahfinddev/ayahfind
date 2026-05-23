"""Arabic normalization and Latin transliteration generation."""

from __future__ import annotations

import re
import unicodedata

from app.core.transliteration import normalize_transliteration

_TASHKEEL = re.compile(r"[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]")
_NON_ARABIC = re.compile(r"[^\u0600-\u06FF\s]")
_TATWEEL = "\u0640"
_PUNCT = re.compile(r"[\u060C\u061B\u061F\u066A-\u066D\u06D4.,;:!?\"'()\[\]{}«»\-_/\\|]+")

_AR_NORMALIZE = str.maketrans(
    {
        "\u0622": "\u0627",
        "\u0623": "\u0627",
        "\u0625": "\u0627",
        "\u0621": "",
        "\u0671": "\u0627",
        "\u0624": "\u0648",
        "\u0626": "\u064A",
        "\u0629": "\u0647",
        "\u0649": "\u064A",
        "\u06CC": "\u064A",
        "\u06A9": "\u0643",
        "\u06BE": "\u0647",
        _TATWEEL: "",
    }
)

_BISMILLAH_NORM: str | None = None


def _bismillah_normalized() -> str:
    global _BISMILLAH_NORM
    if _BISMILLAH_NORM is None:
        _BISMILLAH_NORM = normalize_arabic("بسم الله الرحمن الرحيم")
    return _BISMILLAH_NORM

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
    text = text.replace(_TATWEEL, "")
    text = _TASHKEEL.sub("", text)
    text = text.translate(_AR_NORMALIZE)
    text = _PUNCT.sub(" ", text)
    text = _NON_ARABIC.sub("", text)
    text = re.sub(r"(.)\1{2,}", r"\1\1", text)
    return " ".join(text.split())


def arabic_token_variants(token: str) -> set[str]:
    """Lightweight morph variants for fuzzy token overlap (not stored in corpus)."""
    variants = {token}
    if len(token) > 3 and token.startswith("\u0627\u0644"):
        variants.add(token[2:])
    if len(token) >= 4 and token.endswith("\u0627\u0639"):
        variants.add(token[:-2] + "\u0639")
    if len(token) >= 3 and token.endswith("\u0639") and not token.endswith("\u0627\u0639"):
        variants.add(token[:-1] + "\u0627\u0639")
    if len(token) >= 4 and token.endswith("\u0627\u062a"):
        variants.add(token[:-2])
    if len(token) >= 4 and token.endswith("\u064a\u0646"):
        variants.add(token[:-2])
    if len(token) >= 4 and token.endswith("\u0648\u0646"):
        variants.add(token[:-2])
    return variants


def arabic_for_search(text_ar: str, surah: int, ayah: int) -> str:
    """
    Normalized Arabic for retrieval matching.
    Strips opening basmala on surah 1:1-style openings (not surah 1 or 9).
    Original text_ar is unchanged in storage.
    """
    norm = normalize_arabic(text_ar)
    if surah in (1, 9) or ayah != 1:
        return norm
    bism = _bismillah_normalized()
    if norm == bism:
        return ""
    if norm.startswith(bism + " "):
        return norm[len(bism) :].strip()
    if norm.startswith(bism):
        rest = norm[len(bism) :].strip()
        return rest if rest else norm
    return norm


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
