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


def query_matches_basmala(q_norm: str) -> bool:
    """True when the normalized query is the basmala phrase (or nearly all of it)."""
    if not q_norm:
        return False
    bism = _bismillah_normalized()
    if q_norm == bism:
        return True
    if not q_norm.startswith(bism):
        return False
    rest = q_norm[len(bism) :].strip()
    return len(rest) <= 2

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


# Uthmani basmala prefix (matches frontend quranDisplay.ts) for display stripping only.
# Uses [\u064b-\u0652\u0670]* after each consonant to tolerate any tashkeel ordering.
_D = r"[\u064b-\u0652\u0670]*"
_BISMILLAH_DISPLAY_RE = re.compile(
    rf"^\u0628{_D}\u0633{_D}\u0645{_D}\s*"
    rf"(?:\u0671|\u0627)?\u0644{_D}\u0644{_D}\u0647{_D}\s*"
    rf"(?:\u0671|\u0627)?\u0644{_D}\u0631{_D}\u062d{_D}\u0645{_D}\u0646{_D}\s*"
    rf"(?:\u0671|\u0627)?\u0644{_D}\u0631{_D}\u062d{_D}\u064a{_D}\u0645{_D}\s*",
    re.UNICODE,
)


def strip_bismillah_display(text_ar: str) -> str:
    """Remove leading basmala from Uthmani ayah text (display only; does not affect search)."""
    stripped = _BISMILLAH_DISPLAY_RE.sub("", text_ar).strip()
    return stripped or text_ar


def arabic_for_display(text_ar: str, surah: int, ayah: int) -> str:
    """
    Arabic text for UI cards and reader snippets.
    Surah 1 and 9 unchanged; surah 2-8 and 10-114 ayah 1 strips prepended basmala.
    """
    if surah in (1, 9) or ayah != 1:
        return text_ar
    return strip_bismillah_display(text_ar)


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


_TRANSLITERATION_CACHE: dict[int, str] = {}


def cached_transliteration(ayah_id: int, text_ar: str, surah: int, ayah: int) -> str:
    """Memoized readable Latin transliteration for search matching.

    The corpus's stored `transliteration` field is empty for the entire
    dataset, so callers used to regenerate this from scratch on every single
    request (see phonetic_search.py) — expensive, and never even attempted
    by the lexical engine's prefilter (see lexical_search.py), which meant
    pure-transliteration queries got zero lexical candidates. This computes
    it once per ayah id and reuses it for the life of the process.
    """
    cached = _TRANSLITERATION_CACHE.get(ayah_id)
    if cached is not None:
        return cached
    search_ar = arabic_for_search(text_ar, surah, ayah)
    generated = arabic_to_latin_transliteration(search_ar) if search_ar else ""
    _TRANSLITERATION_CACHE[ayah_id] = generated
    return generated
