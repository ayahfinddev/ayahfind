import navData from "@/data/quranNavigation.json";

export type SurahCatalogEntry = {
  n: number;
  en: string;
  ar: string;
  c: number;
};

export type QuranNavigationData = {
  surahs: SurahCatalogEntry[];
  juzStarts: [number, number][];
  pageStarts: [number, number][];
};

const data = navData as QuranNavigationData;

export const SURAH_CATALOG: SurahCatalogEntry[] = data.surahs;
export const JUZ_STARTS: [number, number][] = data.juzStarts;
export const PAGE_STARTS: [number, number][] = data.pageStarts;

export function getSurahEntry(surah: number): SurahCatalogEntry | undefined {
  return SURAH_CATALOG.find((s) => s.n === surah);
}

export function getJuzForRef(surah: number, ayah: number): number {
  let juz = 1;
  for (let i = JUZ_STARTS.length - 1; i >= 0; i--) {
    const [s, a] = JUZ_STARTS[i];
    if (surah > s || (surah === s && ayah >= a)) {
      juz = i + 1;
      break;
    }
  }
  return juz;
}

export function getPageForRef(surah: number, ayah: number): number {
  let page = 1;
  for (let i = PAGE_STARTS.length - 1; i >= 0; i--) {
    const [s, a] = PAGE_STARTS[i];
    if (surah > s || (surah === s && ayah >= a)) {
      page = i + 1;
      break;
    }
  }
  return page;
}

export function pageStartRef(page: number): [number, number] {
  const idx = Math.max(0, Math.min(PAGE_STARTS.length - 1, page - 1));
  return PAGE_STARTS[idx] ?? [1, 1];
}

export function juzStartRef(juz: number): [number, number] {
  const idx = Math.max(0, Math.min(JUZ_STARTS.length - 1, juz - 1));
  return JUZ_STARTS[idx] ?? [1, 1];
}
