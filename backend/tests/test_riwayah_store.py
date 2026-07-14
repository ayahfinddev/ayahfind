"""Tests for the riwayah service layer (app/services/riwayah_store.py).

Covers: Hafs text reads through the existing (real, verified) QuranStore
corpus unchanged; every other riwayah degrades to a typed "unavailable"
result instead of raising or fabricating text; equivalent-readings never
claims a shared form beyond what can actually be verified today, even if
the registry is monkeypatched to have two "enabled" riwayat with no real
comparison data (regression guard for "Common to all" only ever appearing
when truly verified).
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from app.core.riwayat import RIWAYAH_REGISTRY, RiwayahDefinition  # noqa: E402
from app.services import riwayah_store  # noqa: E402
from app.services.quran_store import QuranStore  # noqa: E402


# ─── get_ayah_text ─────────────────────────────────────────────────────────


def test_hafs_ayah_text_matches_quran_store():
    store = QuranStore()
    rec = store.get_by_ref(1, 1)
    result = riwayah_store.get_ayah_text(1, 1, "hafs-an-asim")
    assert result.text_available is True
    assert result.text_ar == rec.text_ar
    assert result.unavailable_reason is None


def test_hafs_ayah_not_found_is_unavailable_not_error():
    result = riwayah_store.get_ayah_text(1, 9999, "hafs-an-asim")
    assert result.text_available is False
    assert result.unavailable_reason == "ayah_not_found"


def test_disabled_riwayah_ayah_text_is_unavailable():
    result = riwayah_store.get_ayah_text(1, 1, "warsh-an-nafi")
    assert result.text_available is False
    assert result.unavailable_reason == "dataset_unavailable"
    assert result.text_ar is None


def test_unknown_riwayah_ayah_text_is_unavailable():
    result = riwayah_store.get_ayah_text(1, 1, "not-a-real-riwayah")
    assert result.text_available is False
    assert result.unavailable_reason == "unknown_riwayah"


# ─── get_equivalent_readings / get_reading_variants ────────────────────────


def test_equivalent_readings_for_hafs_is_honest_about_no_comparison_data():
    result = riwayah_store.get_equivalent_readings(1, 1, "hafs-an-asim")
    assert result.equivalent_riwayah_ids == ["hafs-an-asim"]
    assert result.comparison_complete is False
    assert result.note == "only_one_riwayah_dataset_available"


def test_equivalent_readings_for_disabled_riwayah_is_empty():
    result = riwayah_store.get_equivalent_readings(1, 1, "warsh-an-nafi")
    assert result.equivalent_riwayah_ids == []
    assert result.comparison_complete is False
    assert result.note == "riwayah_unavailable"


def test_equivalent_readings_never_fabricates_common_to_all(monkeypatch):
    """Even if two riwayat are (hypothetically) both enabled, without a
    real per-ayah comparison dataset the store must not claim they share
    the displayed form — this guards against silently promoting 'enabled'
    to mean 'verified equivalent'."""
    patched = dict(RIWAYAH_REGISTRY)
    patched["warsh-an-nafi"] = RiwayahDefinition(
        **{**RIWAYAH_REGISTRY["warsh-an-nafi"].model_dump(), "is_enabled": True, "text_dataset_id": "fake-warsh-v0"}
    )
    monkeypatch.setattr(riwayah_store, "RIWAYAH_REGISTRY", patched)

    result = riwayah_store.get_equivalent_readings(1, 1, "hafs-an-asim")
    assert result.equivalent_riwayah_ids == ["hafs-an-asim"]
    assert "warsh-an-nafi" not in result.equivalent_riwayah_ids
    assert result.comparison_complete is False
    assert result.note == "comparison_not_yet_implemented"


def test_reading_variants_summary_for_hafs():
    summary = riwayah_store.get_reading_variants(1, 1)
    assert summary.canonical_riwayah_id == "hafs-an-asim"
    assert summary.equivalent_riwayah_ids == ["hafs-an-asim"]
    assert summary.has_reading_variants is False


# ─── get_riwayah_symbols ────────────────────────────────────────────────────


def test_symbols_available_for_hafs():
    result = riwayah_store.get_riwayah_symbols("hafs-an-asim")
    assert result.available is True
    assert result.symbol_set_id == "hafs-madinah-mushaf"


def test_symbols_unavailable_for_disabled_riwayah():
    result = riwayah_store.get_riwayah_symbols("warsh-an-nafi")
    assert result.available is False
    assert result.symbol_set_id == "pending-dataset"


def test_symbols_unknown_riwayah():
    result = riwayah_store.get_riwayah_symbols("not-a-real-riwayah")
    assert result.available is False
    assert result.symbol_set_id is None


# ─── get_available_audio ────────────────────────────────────────────────────


def test_audio_available_for_hafs():
    result = riwayah_store.get_available_audio("hafs-an-asim")
    assert result.available is True
    assert result.reason is None


def test_audio_unavailable_for_disabled_riwayah():
    result = riwayah_store.get_available_audio("warsh-an-nafi", reciter_id="alafasy")
    assert result.available is False
    assert result.reason == "dataset_unavailable"
    assert result.reciter_id == "alafasy"


def test_audio_unavailable_for_unknown_riwayah():
    result = riwayah_store.get_available_audio("not-a-real-riwayah")
    assert result.available is False
    assert result.reason == "unknown_riwayah"
