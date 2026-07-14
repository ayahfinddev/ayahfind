"""Tests for the riwayah registry (app/core/riwayat.py) and the dataset
structural validator (app/core/riwayah_dataset.py).

Covers: Hafs remains the sole default+enabled riwayah, every other entry
is registered but disabled (no verified dataset yet), the safe-fallback
resolver never returns a disabled/unknown id, and the dataset validator
rejects malformed candidate datasets without ever trusting array position
over surah/ayah keys.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from app.core.riwayah_dataset import (  # noqa: E402
    reference_ayah_counts_from_quran_store,
    validate_riwayah_dataset,
)
from app.core.riwayat import (  # noqa: E402
    DEFAULT_RIWAYAH_ID,
    RIWAYAH_REGISTRY,
    get_riwayah,
    is_riwayah_enabled,
    list_riwayat,
    resolve_riwayah_id,
)
from app.services.quran_store import QuranStore  # noqa: E402


# ─── Registry ─────────────────────────────────────────────────────────────


def test_default_riwayah_is_hafs():
    assert DEFAULT_RIWAYAH_ID == "hafs-an-asim"


def test_hafs_is_default_and_enabled():
    hafs = RIWAYAH_REGISTRY[DEFAULT_RIWAYAH_ID]
    assert hafs.is_default is True
    assert hafs.is_enabled is True
    assert hafs.text_dataset_id is not None
    assert hafs.audio_dataset_id is not None


def test_exactly_one_default():
    assert sum(1 for r in RIWAYAH_REGISTRY.values() if r.is_default) == 1


def test_only_hafs_is_enabled_today():
    enabled = [r.id for r in RIWAYAH_REGISTRY.values() if r.is_enabled]
    assert enabled == ["hafs-an-asim"]


def test_all_expected_riwayat_are_registered_even_if_disabled():
    expected_ids = {
        "hafs-an-asim",
        "shubah-an-asim",
        "warsh-an-nafi",
        "qalun-an-nafi",
        "al-duri-an-abi-amr",
        "al-susi-an-abi-amr",
    }
    assert expected_ids.issubset(RIWAYAH_REGISTRY.keys())


def test_disabled_riwayat_have_no_text_dataset():
    for r in RIWAYAH_REGISTRY.values():
        if not r.is_enabled:
            assert r.text_dataset_id is None
            assert r.audio_dataset_id is None


def test_every_riwayah_has_a_distinct_color_token():
    tokens = [r.color_token for r in RIWAYAH_REGISTRY.values()]
    assert len(tokens) == len(set(tokens))


def test_get_riwayah_unknown_id_returns_none():
    assert get_riwayah("does-not-exist") is None


def test_list_riwayat_enabled_only():
    assert [r.id for r in list_riwayat(enabled_only=True)] == ["hafs-an-asim"]


def test_list_riwayat_all_puts_default_first():
    all_riwayat = list_riwayat()
    assert all_riwayat[0].id == DEFAULT_RIWAYAH_ID


def test_is_riwayah_enabled():
    assert is_riwayah_enabled("hafs-an-asim") is True
    assert is_riwayah_enabled("warsh-an-nafi") is False
    assert is_riwayah_enabled("does-not-exist") is False


def test_resolve_riwayah_id_keeps_valid_enabled_id():
    assert resolve_riwayah_id("hafs-an-asim") == "hafs-an-asim"


def test_resolve_riwayah_id_falls_back_for_disabled():
    assert resolve_riwayah_id("warsh-an-nafi") == DEFAULT_RIWAYAH_ID


def test_resolve_riwayah_id_falls_back_for_unknown():
    assert resolve_riwayah_id("not-a-real-id") == DEFAULT_RIWAYAH_ID


def test_resolve_riwayah_id_falls_back_for_none():
    assert resolve_riwayah_id(None) == DEFAULT_RIWAYAH_ID


# ─── Dataset validator ─────────────────────────────────────────────────────


def _tiny_valid_dataset() -> dict:
    surahs = [{"number": n} for n in range(1, 115)]
    ayahs = []
    # Every surah gets exactly 1 ayah for this synthetic minimal fixture.
    for n in range(1, 115):
        ayahs.append({"surah_number": n, "ayah_number": 1, "text_ar": "نص"})
    return {"surahs": surahs, "ayahs": ayahs, "source": "test-fixture", "version": "1"}


def test_validate_minimal_valid_dataset_passes():
    result = validate_riwayah_dataset(_tiny_valid_dataset())
    assert result.valid is True
    assert result.errors == []


def test_validate_rejects_wrong_surah_count():
    dataset = _tiny_valid_dataset()
    dataset["surahs"] = dataset["surahs"][:113]
    result = validate_riwayah_dataset(dataset)
    assert result.valid is False
    assert any("114" in e for e in result.errors)


def test_validate_rejects_non_contiguous_ayah_numbers():
    dataset = _tiny_valid_dataset()
    dataset["ayahs"][0]["ayah_number"] = 5  # surah 1 now only has ayah 5, not 1
    result = validate_riwayah_dataset(dataset)
    assert result.valid is False
    assert any("contiguous" in e for e in result.errors)


def test_validate_rejects_duplicate_ayah_key():
    dataset = _tiny_valid_dataset()
    dataset["ayahs"].append({"surah_number": 1, "ayah_number": 1, "text_ar": "نص"})
    result = validate_riwayah_dataset(dataset)
    assert result.valid is False
    assert any("duplicate" in e for e in result.errors)


def test_validate_rejects_empty_text():
    dataset = _tiny_valid_dataset()
    dataset["ayahs"][0]["text_ar"] = "   "
    result = validate_riwayah_dataset(dataset)
    assert result.valid is False
    assert any("empty text_ar" in e for e in result.errors)


def test_validate_rejects_missing_metadata():
    dataset = _tiny_valid_dataset()
    del dataset["source"]
    result = validate_riwayah_dataset(dataset)
    assert result.valid is False
    assert any("source" in e for e in result.errors)


def test_validate_cross_checks_against_reference_counts():
    dataset = _tiny_valid_dataset()  # 1 ayah per surah
    reference = {n: 7 for n in range(1, 115)}  # pretend every surah should have 7 ayahs
    result = validate_riwayah_dataset(dataset, reference_ayah_counts=reference)
    assert result.valid is False
    assert any("ayah count mismatch" in e for e in result.errors)


def test_reference_ayah_counts_from_quran_store_matches_real_corpus():
    store = QuranStore()
    counts = reference_ayah_counts_from_quran_store(store)
    assert len(counts) == 114
    assert counts[1] == 7  # Al-Fatiha
    assert sum(counts.values()) == 6236


def test_hafs_dataset_structure_passes_against_itself():
    """The existing verified Hafs corpus, reshaped into the candidate
    dataset shape, must pass its own validator (sanity check that the
    validator isn't overly strict for real, correct data)."""
    store = QuranStore()
    store.load()
    surahs = [{"number": meta.number} for meta in store._surahs.values()]
    ayahs = [
        {"surah_number": a.surah_number, "ayah_number": a.ayah_number, "text_ar": a.text_ar}
        for a in store.ayahs
    ]
    dataset = {"surahs": surahs, "ayahs": ayahs, "source": "hafs-corpus", "version": "existing"}
    result = validate_riwayah_dataset(dataset)
    assert result.valid is True, result.errors
