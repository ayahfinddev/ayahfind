import { describe, it, expect } from "vitest";
import { getDiscoverSuggestions } from "./discoverEngine";
import { SEARCH_TOPICS } from "./searchTopics";

const fixedRandom = () => 0.5;

describe("getDiscoverSuggestions", () => {
  it("includes the Friday card only when isJumuah is true", () => {
    const withFriday = getDiscoverSuggestions({ isJumuah: true, random: fixedRandom });
    const withoutFriday = getDiscoverSuggestions({ isJumuah: false, random: fixedRandom });

    expect(withFriday.some((c) => c.source === "calendar")).toBe(true);
    expect(withoutFriday.some((c) => c.source === "calendar")).toBe(false);
  });

  it("never returns duplicate labels", () => {
    const cards = getDiscoverSuggestions({ isJumuah: true, count: 8, random: fixedRandom });
    const labels = cards.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("respects the requested count", () => {
    const cards = getDiscoverSuggestions({ isJumuah: false, count: 3, random: fixedRandom });
    expect(cards.length).toBe(3);
  });

  it("surfaces never-viewed topics before heavily-viewed ones", () => {
    const heavilyViewed = SEARCH_TOPICS[0].label;
    const engagement = { [heavilyViewed]: { views: 100, lastSeen: Date.now() } };
    const cards = getDiscoverSuggestions({
      isJumuah: false,
      engagement,
      count: SEARCH_TOPICS.length,
      random: fixedRandom,
    });
    const rareCards = cards.filter((c) => c.source === "rare");
    expect(rareCards.every((c) => c.label !== heavilyViewed)).toBe(true);
  });

  it("accepts a `trending` param without using it (architecture-only extension point)", () => {
    const cards = getDiscoverSuggestions({
      isJumuah: false,
      trending: [{ label: "x", weight: 1, source: "test" }],
      random: fixedRandom,
    });
    expect(Array.isArray(cards)).toBe(true);
  });
});
