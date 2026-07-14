"""
Central registry of supported riwayat (Quran reading transmissions).

Terminology (kept distinct on purpose — do not collapse these):
  - Qira'ah:  the reading associated with an Imam (e.g. Qira'at 'Asim).
  - Riwayah:  a transmission associated with a narrator (e.g. Hafs 'an
              'Asim, Warsh 'an Nafi'). This is the unit the rest of the
              app selects/displays/persists.
  - Reading group: several riwayat that share the exact displayed form at
              a particular ayah (see riwayah_store.get_equivalent_readings).

Only `hafs-an-asim` is enabled today because it is the only riwayah for
which this repository holds a complete, verified text dataset — the same
corpus QuranStore already serves from data/processed/ayahs_processed.json.

Every other entry documents a riwayah this architecture is ready to
support the moment a complete, verified dataset + attribution is
integrated (see docs/RIWAYAH_ARCHITECTURE.md). Enabling one is a data
task (populate text_dataset_id, pass dataset_validation, add
attribution), never a hardcoded UI change — nothing outside this registry
should hardcode a riwayah name or assume only Hafs exists.
"""

from __future__ import annotations

from pydantic import BaseModel


class RiwayahDefinition(BaseModel):
    id: str
    display_name: str
    short_name: str
    qiraah_name: str
    imam_name: str
    narrator_name: str
    text_dataset_id: str | None
    audio_dataset_id: str | None
    symbol_set_id: str
    color_token: str
    is_default: bool
    is_enabled: bool


_DEFINITIONS: list[RiwayahDefinition] = [
    RiwayahDefinition(
        id="hafs-an-asim",
        display_name="Ḩafṣ ʿan ʿĀṣim",
        short_name="Hafs",
        qiraah_name="Qira'at 'Asim",
        imam_name="'Asim ibn Abi al-Najud",
        narrator_name="Hafs ibn Sulayman al-Asadi",
        text_dataset_id="hafs-an-asim-madinah-v1",
        audio_dataset_id="everyayah-hafs",
        symbol_set_id="hafs-madinah-mushaf",
        color_token="hafs",
        is_default=True,
        is_enabled=True,
    ),
    RiwayahDefinition(
        id="shubah-an-asim",
        display_name="Shu'bah 'an 'Asim",
        short_name="Shu'bah",
        qiraah_name="Qira'at 'Asim",
        imam_name="'Asim ibn Abi al-Najud",
        narrator_name="Shu'bah ibn 'Ayyash",
        text_dataset_id=None,
        audio_dataset_id=None,
        symbol_set_id="pending-dataset",
        color_token="shubah",
        is_default=False,
        is_enabled=False,
    ),
    RiwayahDefinition(
        id="warsh-an-nafi",
        display_name="Warsh 'an Nafi'",
        short_name="Warsh",
        qiraah_name="Qira'at Nafi'",
        imam_name="Nafi' al-Madani",
        narrator_name="Warsh ('Uthman ibn Sa'id al-Misri)",
        text_dataset_id=None,
        audio_dataset_id=None,
        symbol_set_id="pending-dataset",
        color_token="warsh",
        is_default=False,
        is_enabled=False,
    ),
    RiwayahDefinition(
        id="qalun-an-nafi",
        display_name="Qalun 'an Nafi'",
        short_name="Qalun",
        qiraah_name="Qira'at Nafi'",
        imam_name="Nafi' al-Madani",
        narrator_name="Qalun ('Isa ibn Mina)",
        text_dataset_id=None,
        audio_dataset_id=None,
        symbol_set_id="pending-dataset",
        color_token="qalun",
        is_default=False,
        is_enabled=False,
    ),
    RiwayahDefinition(
        id="al-duri-an-abi-amr",
        display_name="Al-Duri 'an Abi 'Amr",
        short_name="Al-Duri",
        qiraah_name="Qira'at Abi 'Amr",
        imam_name="Abu 'Amr ibn al-'Ala' al-Basri",
        narrator_name="Al-Duri (Hafs ibn 'Umar al-Duri)",
        text_dataset_id=None,
        audio_dataset_id=None,
        symbol_set_id="pending-dataset",
        color_token="al-duri",
        is_default=False,
        is_enabled=False,
    ),
    RiwayahDefinition(
        id="al-susi-an-abi-amr",
        display_name="Al-Susi 'an Abi 'Amr",
        short_name="Al-Susi",
        qiraah_name="Qira'at Abi 'Amr",
        imam_name="Abu 'Amr ibn al-'Ala' al-Basri",
        narrator_name="Al-Susi (Salih ibn Ziyad)",
        text_dataset_id=None,
        audio_dataset_id=None,
        symbol_set_id="pending-dataset",
        color_token="al-susi",
        is_default=False,
        is_enabled=False,
    ),
]

RIWAYAH_REGISTRY: dict[str, RiwayahDefinition] = {r.id: r for r in _DEFINITIONS}

DEFAULT_RIWAYAH_ID = "hafs-an-asim"

assert RIWAYAH_REGISTRY[DEFAULT_RIWAYAH_ID].is_default
assert RIWAYAH_REGISTRY[DEFAULT_RIWAYAH_ID].is_enabled
assert sum(1 for r in _DEFINITIONS if r.is_default) == 1


def get_riwayah(riwayah_id: str) -> RiwayahDefinition | None:
    return RIWAYAH_REGISTRY.get(riwayah_id)


def list_riwayat(*, enabled_only: bool = False) -> list[RiwayahDefinition]:
    values = list(RIWAYAH_REGISTRY.values())
    if enabled_only:
        values = [r for r in values if r.is_enabled]
    return sorted(values, key=lambda r: (not r.is_default, r.display_name))


def is_riwayah_enabled(riwayah_id: str) -> bool:
    r = RIWAYAH_REGISTRY.get(riwayah_id)
    return bool(r and r.is_enabled)


def resolve_riwayah_id(riwayah_id: str | None) -> str:
    """Fall back to the default riwayah for missing/unknown/disabled ids.

    Used when persisted or client-supplied riwayah ids need a safe value —
    never crashes on an invalid/stale id (see Continue Reading migration)."""
    if riwayah_id and is_riwayah_enabled(riwayah_id):
        return riwayah_id
    return DEFAULT_RIWAYAH_ID
