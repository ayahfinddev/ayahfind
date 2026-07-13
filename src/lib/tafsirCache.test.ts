import { describe, it, expect, beforeEach, vi } from "vitest";
import { getCachedTafsir, setCachedTafsir } from "./tafsirCache";
import type { TafsirResponse } from "./types";

function makeResponse(verseKey: string): TafsirResponse {
  return {
    verse_key: verseKey,
    available: true,
    entries: [
      {
        source_slug: "ibn_kathir_en",
        source_title: "Tafsir Ibn Kathir (Abridged)",
        author: "Hafiz Ibn Kathir",
        language: "en",
        provider: "Quran Foundation",
        attribution: "Tafsir Ibn Kathir — via Quran Foundation",
        license_note: "test",
        verse_start: verseKey,
        verse_end: verseKey,
        text: `Explanation of ${verseKey}`,
      },
    ],
  };
}

describe("tafsirCache", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns undefined for a verse that was never cached", () => {
    expect(getCachedTafsir("999:1")).toBeUndefined();
  });

  it("returns what was stored for the same verse_key", () => {
    const data = makeResponse("1:1");
    setCachedTafsir("1:1", data);
    expect(getCachedTafsir("1:1")).toEqual(data);
  });

  it("keeps entries independent per verse_key", () => {
    setCachedTafsir("1:1", makeResponse("1:1"));
    setCachedTafsir("1:2", makeResponse("1:2"));
    expect(getCachedTafsir("1:1")?.verse_key).toBe("1:1");
    expect(getCachedTafsir("1:2")?.verse_key).toBe("1:2");
  });

  it("evicts the oldest entry once the bound is exceeded", () => {
    // MAX_ENTRIES is 60; fill past that and confirm the earliest is gone
    // while a recently written one survives.
    for (let i = 0; i < 70; i++) {
      setCachedTafsir(`2:${i}`, makeResponse(`2:${i}`));
    }
    expect(getCachedTafsir("2:0")).toBeUndefined();
    expect(getCachedTafsir("2:69")).toBeDefined();
  });
});
