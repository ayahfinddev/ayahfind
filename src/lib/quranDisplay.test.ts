import { describe, it, expect } from "vitest";
import {
  showsBismillahHeader,
  stripBismillahPrefix,
  prepareReaderAyahs,
} from "./quranDisplay";
import type { AyahDetail } from "./types";

const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
const BASMALA_SHADDA = "بِّسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

function makeAyah(surah: number, ayah: number, text_ar: string): AyahDetail {
  return { surah, ayah, text_ar };
}

describe("showsBismillahHeader", () => {
  it("returns false for Surah 1 (Al-Fatihah)", () => {
    expect(showsBismillahHeader(1)).toBe(false);
  });

  it("returns true for Surah 2 (Al-Baqarah)", () => {
    expect(showsBismillahHeader(2)).toBe(true);
  });

  it("returns false for Surah 9 (At-Tawbah)", () => {
    expect(showsBismillahHeader(9)).toBe(false);
  });

  it("returns true for Surah 97 (Al-Qadr)", () => {
    expect(showsBismillahHeader(97)).toBe(true);
  });
});

describe("stripBismillahPrefix", () => {
  it("strips standard basmala prefix", () => {
    const result = stripBismillahPrefix(`${BASMALA} الٓمٓ`);
    expect(result).toBe("الٓمٓ");
  });

  it("strips basmala with shadda on ba (surahs 95, 97)", () => {
    const result = stripBismillahPrefix(`${BASMALA_SHADDA} إِنَّآ أَنزَلْنَٰهُ`);
    expect(result).toBe("إِنَّآ أَنزَلْنَٰهُ");
  });

  it("returns original text when no basmala prefix", () => {
    const text = "بَرَآءَةٌۭ مِّنَ ٱللَّهِ";
    expect(stripBismillahPrefix(text)).toBe(text);
  });

  it("returns original text when stripping would yield empty string", () => {
    expect(stripBismillahPrefix(BASMALA)).toBe(BASMALA);
  });
});

describe("prepareReaderAyahs", () => {
  it("Surah 1: does not strip basmala (it IS ayah 1)", () => {
    const ayahs = [makeAyah(1, 1, BASMALA)];
    const result = prepareReaderAyahs(1, ayahs);
    expect(result[0].text_ar).toBe(BASMALA);
  });

  it("Surah 2: strips basmala from ayah 1", () => {
    const ayahs = [
      makeAyah(2, 1, `${BASMALA} الٓمٓ`),
      makeAyah(2, 2, "ذَٰلِكَ ٱلْكِتَابُ"),
    ];
    const result = prepareReaderAyahs(2, ayahs);
    expect(result[0].text_ar).toBe("الٓمٓ");
    expect(result[1].text_ar).toBe("ذَٰلِكَ ٱلْكِتَابُ");
  });

  it("Surah 2: prefers text_ar_display from API when available", () => {
    const ayahs = [{ ...makeAyah(2, 1, `${BASMALA} الٓمٓ`), text_ar_display: "الٓمٓ" }];
    const result = prepareReaderAyahs(2, ayahs);
    expect(result[0].text_ar).toBe("الٓمٓ");
  });

  it("Surah 9: does not strip (no basmala header)", () => {
    const text = "بَرَآءَةٌۭ مِّنَ ٱللَّهِ";
    const ayahs = [makeAyah(9, 1, text)];
    const result = prepareReaderAyahs(9, ayahs);
    expect(result[0].text_ar).toBe(text);
  });

  it("Surah 97: strips basmala with shadda variant", () => {
    const body = "إِنَّآ أَنزَلْنَٰهُ فِى لَيْلَةِ ٱلْقَدْرِ";
    const ayahs = [makeAyah(97, 1, `${BASMALA_SHADDA} ${body}`)];
    const result = prepareReaderAyahs(97, ayahs);
    expect(result[0].text_ar).toBe(body);
  });
});
