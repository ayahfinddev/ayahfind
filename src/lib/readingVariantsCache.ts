import type { ReadingVariantsResponse } from "./types";

/**
 * Bounded in-memory cache keyed by "surah:ayah", mirroring tafsirCache.ts.
 * A search results page can render many cards at once; without this every
 * card would independently refetch the same lightweight metadata on
 * re-render.
 */
const MAX_ENTRIES = 120;
const cache = new Map<string, ReadingVariantsResponse>();

function verseKey(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

export function getCachedReadingVariants(surah: number, ayah: number): ReadingVariantsResponse | undefined {
  return cache.get(verseKey(surah, ayah));
}

export function setCachedReadingVariants(surah: number, ayah: number, data: ReadingVariantsResponse): void {
  const key = verseKey(surah, ayah);
  cache.delete(key);
  cache.set(key, data);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}
