"""Regression tests for basmala display stripping."""

import pytest
from app.core.arabic_text import arabic_for_display, strip_bismillah_display

BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"
BASMALA_SHADDA = "بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ"


class TestStripBismillahDisplay:
    def test_strips_standard_basmala(self):
        assert strip_bismillah_display(f"{BASMALA} الٓمٓ") == "الٓمٓ"

    def test_strips_shadda_variant(self):
        assert strip_bismillah_display(f"{BASMALA_SHADDA} إِنَّآ أَنزَلْنَٰهُ") == "إِنَّآ أَنزَلْنَٰهُ"

    def test_returns_original_when_no_prefix(self):
        text = "بَرَآءَةٌۭ مِّنَ ٱللَّهِ"
        assert strip_bismillah_display(text) == text

    def test_returns_original_when_result_empty(self):
        assert strip_bismillah_display(BASMALA) == BASMALA


class TestArabicForDisplay:
    def test_surah1_unchanged(self):
        assert arabic_for_display(BASMALA, 1, 1) == BASMALA

    def test_surah2_ayah1_stripped(self):
        text = f"{BASMALA} الٓمٓ"
        assert arabic_for_display(text, 2, 1) == "الٓمٓ"

    def test_surah2_ayah2_unchanged(self):
        text = "ذَٰلِكَ ٱلْكِتَابُ"
        assert arabic_for_display(text, 2, 2) == text

    def test_surah9_unchanged(self):
        text = "بَرَآءَةٌۭ مِّنَ ٱللَّهِ"
        assert arabic_for_display(text, 9, 1) == text

    def test_surah97_ayah1_stripped(self):
        body = "إِنَّآ أَنزَلْنَٰهُ فِى لَيْلَةِ ٱلْقَدْرِ"
        text = f"{BASMALA_SHADDA} {body}"
        assert arabic_for_display(text, 97, 1) == body
