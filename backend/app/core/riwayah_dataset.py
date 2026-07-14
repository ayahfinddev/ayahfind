"""
Structural validation for a candidate riwayah text dataset, before it is
ever wired into riwayah_store.get_ayah_text.

This module does NOT hardcode a canonical per-surah ayah-count table from
memory (that risks silently baking in a transcription error and would be
exactly the kind of unverified data these tools must avoid). Instead it
validates a candidate dataset's *internal* structure (114 surahs, 1..N
contiguous ayah numbering, required attribution/version metadata) and,
when a reference mapping is supplied, cross-checks surah/ayah identifiers
against it — e.g. built from the already-verified Hafs corpus via
`reference_ayah_counts_from_quran_store`. Never merge or compare datasets
merely by array position; always key by (surah_number, ayah_number).
"""

from __future__ import annotations

from dataclasses import dataclass, field

EXPECTED_SURAH_COUNT = 114
REQUIRED_METADATA_FIELDS = ("source", "version")


@dataclass
class DatasetValidationResult:
    valid: bool
    errors: list[str] = field(default_factory=list)


def reference_ayah_counts_from_quran_store(store) -> dict[int, int]:
    """Build a {surah_number: ayah_count} reference map from the existing,
    already-verified QuranStore corpus (Hafs). Use this to cross-check a
    new candidate dataset's ayah mapping rather than trusting array order."""
    store.load()
    counts: dict[int, int] = {}
    for rec in store.ayahs:
        counts[rec.surah_number] = counts.get(rec.surah_number, 0) + 1
    return counts


def validate_riwayah_dataset(
    candidate: dict,
    *,
    reference_ayah_counts: dict[int, int] | None = None,
) -> DatasetValidationResult:
    errors: list[str] = []

    surahs = candidate.get("surahs")
    ayahs = candidate.get("ayahs")

    if not isinstance(surahs, list):
        errors.append("missing or invalid 'surahs' list")
        surahs = []
    if not isinstance(ayahs, list):
        errors.append("missing or invalid 'ayahs' list")
        ayahs = []

    surah_numbers = {s.get("number") for s in surahs if isinstance(s, dict)}
    if len(surah_numbers) != EXPECTED_SURAH_COUNT:
        errors.append(
            f"expected exactly {EXPECTED_SURAH_COUNT} distinct surah numbers, "
            f"found {len(surah_numbers)}"
        )
    if surah_numbers and surah_numbers != set(range(1, EXPECTED_SURAH_COUNT + 1)):
        missing = sorted(set(range(1, EXPECTED_SURAH_COUNT + 1)) - surah_numbers)
        extra = sorted(surah_numbers - set(range(1, EXPECTED_SURAH_COUNT + 1)))
        if missing:
            errors.append(f"missing surah numbers: {missing}")
        if extra:
            errors.append(f"unexpected surah numbers: {extra}")

    seen_refs: set[tuple[int, int]] = set()
    per_surah_ayah_numbers: dict[int, set[int]] = {}
    for row in ayahs:
        if not isinstance(row, dict):
            errors.append("ayah row is not an object")
            continue
        surah_number = row.get("surah_number")
        ayah_number = row.get("ayah_number")
        text_ar = row.get("text_ar")
        if surah_number is None or ayah_number is None:
            errors.append(f"ayah row missing surah_number/ayah_number: {row!r}")
            continue
        if not text_ar or not str(text_ar).strip():
            errors.append(f"ayah row {surah_number}:{ayah_number} has empty text_ar")
        ref = (surah_number, ayah_number)
        if ref in seen_refs:
            errors.append(f"duplicate ayah key {surah_number}:{ayah_number}")
        seen_refs.add(ref)
        per_surah_ayah_numbers.setdefault(surah_number, set()).add(ayah_number)

    for surah_number, ayah_numbers in per_surah_ayah_numbers.items():
        expected_range = set(range(1, max(ayah_numbers) + 1))
        if ayah_numbers != expected_range:
            errors.append(
                f"surah {surah_number} ayah numbering is not contiguous 1..{max(ayah_numbers)}"
            )

    if reference_ayah_counts is not None:
        candidate_counts = {s: len(a) for s, a in per_surah_ayah_numbers.items()}
        for surah_number, expected_count in reference_ayah_counts.items():
            actual_count = candidate_counts.get(surah_number, 0)
            if actual_count != expected_count:
                errors.append(
                    f"surah {surah_number} ayah count mismatch: expected {expected_count} "
                    f"(from reference corpus), found {actual_count}"
                )

    for field_name in REQUIRED_METADATA_FIELDS:
        if not candidate.get(field_name):
            errors.append(f"missing required metadata field: {field_name!r}")

    return DatasetValidationResult(valid=not errors, errors=errors)
