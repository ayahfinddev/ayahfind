import type { AyahDetail } from "@/lib/types";

export const BISMILLAH_AR =
  "\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064e\u0647\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650";

// Matches any ordering of tashkeel after each consonant in \u0628\u0633\u0645 \u0627\u0644\u0644\u0647 \u0627\u0644\u0631\u062d\u0645\u0646 \u0627\u0644\u0631\u062d\u064a\u0645
const _D = "[\\u064b-\\u0652\\u0670]*"; // zero-or-more Arabic diacritics
const BISMILLAH_PREFIX_RE = new RegExp(
  `^\\u0628${_D}\\u0633${_D}\\u0645${_D}\\s*` +
  `(?:\\u0671|\\u0627)?\\u0644${_D}\\u0644${_D}\\u0647${_D}\\s*` +
  `(?:\\u0671|\\u0627)?\\u0644${_D}\\u0631${_D}\\u062d${_D}\\u0645${_D}\\u0646${_D}\\s*` +
  `(?:\\u0671|\\u0627)?\\u0644${_D}\\u0631${_D}\\u062d${_D}\\u064a${_D}\\u0645${_D}\\s*`,
  "u"
);

export function showsBismillahHeader(surah: number): boolean {
  return surah !== 1 && surah !== 9;
}

export function stripBismillahPrefix(text: string): string {
  const stripped = text.replace(BISMILLAH_PREFIX_RE, "").trim();
  return stripped || text;
}

export function prepareReaderAyahs(surah: number, ayahs: AyahDetail[]): AyahDetail[] {
  if (!showsBismillahHeader(surah)) return ayahs;
  return ayahs.map((a) => {
    if (a.ayah !== 1) return a;
    const stripped = a.text_ar_display ?? stripBismillahPrefix(a.text_ar);
    return { ...a, text_ar: stripped };
  });
}

/** Arabic shown on search result cards (API text_ar_display or local strip). */
export function displayArabicForResult(
  surah: number,
  ayah: number,
  text_ar?: string | null,
  text_ar_display?: string | null
): string {
  if (text_ar_display) return text_ar_display;
  if (!text_ar) return "";
  if (showsBismillahHeader(surah) && ayah === 1) {
    return stripBismillahPrefix(text_ar);
  }
  return text_ar;
}