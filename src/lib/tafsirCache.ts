import type { TafsirResponse } from "./types";

/**
 * Bounded in-memory cache keyed by verse_key alone (e.g. "2:3" — encodes
 * both surah and ayah).
 *
 * Why not also key by source/language: GET /api/v1/tafsir/{surah}/{ayah}
 * always returns *every* approved source for that verse in one response
 * (see TafsirPanel — the source tabs switch between entries already held
 * in state, they don't trigger separate fetches). There is only ever one
 * fetch per verse_key, so a cache entry for "2:3" already represents the
 * full (surah, ayah) x (source, language) cross-product for that verse —
 * splitting the key further would just fragment one response across
 * several cache slots with no fewer network calls avoided.
 *
 * Bounded so a long reading session covering many surahs can't grow this
 * unboundedly.
 */
const MAX_ENTRIES = 60;
const cache = new Map<string, TafsirResponse>();

export function getCachedTafsir(verseKey: string): TafsirResponse | undefined {
  return cache.get(verseKey);
}

export function setCachedTafsir(verseKey: string, data: TafsirResponse): void {
  cache.delete(verseKey);
  cache.set(verseKey, data);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}
