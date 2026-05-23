"""Search regression tests."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.services.quran_search_engine import CONFIDENCE_MEDIUM, QuranSearchEngine

CORPUS = ROOT / "data" / "processed" / "quran_search_corpus.json"


@pytest.fixture(scope="module")
def engine() -> QuranSearchEngine:
    if not CORPUS.exists():
        pytest.skip("Corpus missing — run: python -m data_pipeline.build_corpus_now")
    data = json.loads(CORPUS.read_text(encoding="utf-8"))
    return QuranSearchEngine(data["ayahs"])


def top_ref(result) -> tuple[int, int]:
    assert result.primary, f"Expected primary hit, message={result.message}"
    h = result.primary[0]
    return h.surah, h.ayah


def test_75_36_garbled_transliteration(engine: QuranSearchEngine):
    r = engine.search("ayahsabul insanu ayyutraka suda")
    assert top_ref(r) == (75, 36)
    assert r.primary[0].confidence >= CONFIDENCE_MEDIUM


def test_75_36_cleaner_transliteration(engine: QuranSearchEngine):
    r = engine.search("ayahsabu al insanu an yutraka suda")
    assert top_ref(r) == (75, 36)


def test_2_286_transliteration(engine: QuranSearchEngine):
    r = engine.search("la yukallifullahu nafsan illa wusaha")
    assert top_ref(r) == (2, 286)


def test_17_32_zina_not_2_187(engine: QuranSearchEngine):
    r = engine.search("wa la taqrabu zina")
    assert top_ref(r) == (17, 32)


def test_112_1(engine: QuranSearchEngine):
    r = engine.search("qul huwallahu ahad")
    assert top_ref(r) == (112, 1)


def test_1_5(engine: QuranSearchEngine):
    r = engine.search("iyyaka nabudu wa iyyaka nastain")
    assert top_ref(r) == (1, 5)


def test_2_201(engine: QuranSearchEngine):
    r = engine.search("rabbana atina fid dunya hasanah")
    assert top_ref(r) == (2, 201)


def test_english_burden(engine: QuranSearchEngine):
    r = engine.search("not burden a soul")
    assert top_ref(r) == (2, 286)


def test_english_zina(engine: QuranSearchEngine):
    r = engine.search("do not approach zina")
    assert top_ref(r) == (17, 32)


def test_no_confident_match_message(engine: QuranSearchEngine):
    r = engine.search("xyzzy foobar nonsense query zz")
    assert r.primary == []
    assert r.message is not None
    assert "No confident match" in r.message


def test_weak_matches_not_in_primary(engine: QuranSearchEngine):
    r = engine.search("xyzzy foobar nonsense query zz")
    for h in r.primary:
        assert h.confidence >= CONFIDENCE_MEDIUM
    for h in r.weak_matches:
        assert h.confidence < CONFIDENCE_MEDIUM

def test_theme_patience(engine: QuranSearchEngine):
    r = engine.search("patience", top_k=5)
    assert r.primary, r.message
    refs = {(h.surah, h.ayah) for h in r.primary}
    assert (2, 153) in refs
    assert r.primary[0].match_mode in ("thematic", "english")
    assert r.intent_hint and "Meaning" in r.intent_hint


def test_theme_gratitude(engine: QuranSearchEngine):
    r = engine.search("gratitude", top_k=5)
    assert r.primary, r.message
    assert any(h.surah == 14 and h.ayah == 7 for h in r.primary[:5])


def test_56_75_voice_arabic_plural_stars(engine: QuranSearchEngine):
    """STT often uses مواقع; Uthmani text has موقع (56:75)."""
    r = engine.search("فلا اقسم بمواقع النجوم", top_k=8)
    assert top_ref(r) == (56, 75)


def test_theme_mercy_not_exact_phrase(engine: QuranSearchEngine):
    r = engine.search("mercy", top_k=3)
    assert len(r.primary) >= 1
    assert r.primary[0].confidence >= CONFIDENCE_MEDIUM
