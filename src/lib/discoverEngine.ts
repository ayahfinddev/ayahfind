import { SEARCH_TOPICS, type SearchTopic } from "./searchTopics";
import { getRareTopics, type EngagementMap } from "@/hooks/useTopicEngagement";

export type DiscoverSource = "calendar" | "rare" | "related" | "random" | "trending";

export interface DiscoverCard {
  label: string;
  surah: number;
  ayah: number;
  tags?: string[];
  source: DiscoverSource;
}

/** Future extension point — never populated today. A real trending feed
 * would rank these and this engine would blend them in alongside the
 * other signals; the type exists so that integration doesn't require
 * reshaping the rest of the engine later. */
export interface TrendingSignal {
  label: string;
  weight: number;
  source: string;
}

const FRIDAY_TOPIC: SearchTopic = {
  label: "Surah Al-Kahf (Friday)",
  queries: ["surah al kahf", "the cave", "friday reading"],
  tags: ["kahf", "friday", "jumuah"],
  surah: 18,
  ayah: 1,
};

export interface DiscoverInput {
  /** `new Date().getDay() === 5` — computed by the caller, not this module, so the engine stays a pure function. */
  isJumuah: boolean;
  recentSearches?: string[];
  recentBookmarkSurahs?: number[];
  engagement?: EngagementMap;
  /** Architecture only — always `undefined` in production today. */
  trending?: TrendingSignal[];
  count?: number;
  /** Injectable for deterministic tests; defaults to `Math.random`. */
  random?: () => number;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function toCard(topic: SearchTopic, source: DiscoverSource): DiscoverCard {
  return { label: topic.label, surah: topic.surah, ayah: topic.ayah, tags: topic.tags, source };
}

export function getDiscoverSuggestions(input: DiscoverInput): DiscoverCard[] {
  const {
    isJumuah,
    recentSearches = [],
    recentBookmarkSurahs = [],
    engagement = {},
    trending,
    count = 5,
    random = Math.random,
  } = input;

  const cards: DiscoverCard[] = [];
  const used = new Set<string>();

  const take = (topic: SearchTopic | undefined, source: DiscoverSource) => {
    if (!topic || used.has(topic.label)) return;
    used.add(topic.label);
    cards.push(toCard(topic, source));
  };

  // 1. Calendar signal — Friday/Jumu'ah only, no Ramadan/Hijri math (see
  // docs/DESIGN_SYSTEM.md-adjacent plan notes: an approximate Hijri
  // conversion would be wrong often enough to be worse than no signal).
  if (isJumuah) take(FRIDAY_TOPIC, "calendar");

  // 2. A topic related to the user's recent bookmarks or search text.
  const related = SEARCH_TOPICS.find(
    (t) =>
      recentBookmarkSurahs.includes(t.surah) ||
      recentSearches.some((q) => t.label.toLowerCase().includes(q.toLowerCase()) || q.toLowerCase().includes(t.label.toLowerCase()))
  );
  take(related, "related");

  // 3. Rarely-explored topics (never-viewed sort first).
  const rareLabels = getRareTopics(
    SEARCH_TOPICS.map((t) => t.label).filter((l) => !used.has(l)),
    engagement,
    2
  );
  for (const label of rareLabels) {
    take(SEARCH_TOPICS.find((t) => t.label === label), "rare");
  }

  // 4. Random fill from whatever's left.
  const remaining = shuffle(
    SEARCH_TOPICS.filter((t) => !used.has(t.label)),
    random
  );
  for (const topic of remaining) {
    if (cards.length >= count) break;
    take(topic, "random");
  }

  // 5. Future: merge ranked `trending` signals into the mix here once a
  // real trending feed exists. Never populated today — `trending` is
  // accepted for its type shape only.
  void trending;

  return cards.slice(0, count);
}
