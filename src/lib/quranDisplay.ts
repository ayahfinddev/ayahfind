import type { AyahDetail } from "@/lib/types";

export const BISMILLAH_AR =
  "\u0628\u0650\u0633\u0652\u0645\u0650 \u0671\u0644\u0644\u0651\u064e\u0647\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646\u0650 \u0671\u0644\u0631\u0651\u064e\u062d\u0650\u064a\u0645\u0650";

const BISMILLAH_PREFIX_RE =
  /^\u0628\u0650\u0633\u0652\u0645\u0650\s*(?:\u0671|\u0627)?\u0644\u0644\u0651?\u064e?\u0647\u0650\s*(?:\u0671|\u0627)?\u0644\u0631\u0651?\u064e?\u062d\u0652\u0645\u064e?\u0670?\u0646\u0650\s*(?:\u0671|\u0627)?\u0644\u0631\u0651?\u064e?\u062d\u0650\u064a\u0645\u0650\s*/u;

export function showsBismillahHeader(surah: number): boolean {
  return surah !== 1 && surah !== 9;
}

export function stripBismillahPrefix(text: string): string {
  const stripped = text.replace(BISMILLAH_PREFIX_RE, "").trim();
  return stripped || text;
}

export function prepareReaderAyahs(surah: number, ayahs: AyahDetail[]): AyahDetail[] {
  if (!showsBismillahHeader(surah)) return ayahs;
  return ayahs.map((a) =>
    a.ayah === 1 ? { ...a, text_ar: stripBismillahPrefix(a.text_ar) } : a
  );
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