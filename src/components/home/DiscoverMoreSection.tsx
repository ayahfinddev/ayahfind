"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { getDiscoverSuggestions } from "@/lib/discoverEngine";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useTopicEngagement } from "@/hooks/useTopicEngagement";
import { IconButton } from "@/components/ui/IconButton";

const isJumuah = new Date().getDay() === 5;

// Six curated photos (Pexels, free license) mapped onto the topic pool by
// theme. More topics exist than sourced photos, so several related labels
// share an image — a real photo per label is a follow-up, not solved here.
const LEAF = "https://images.pexels.com/photos/122429/leaf-nature-green-spring-122429.jpeg";
const HOURGLASS = "https://images.pexels.com/photos/9862247/pexels-photo-9862247.jpeg";
const MOSQUE_DOOR = "https://images.pexels.com/photos/17870723/pexels-photo-17870723.jpeg";
const FOREST_PATH = "https://images.pexels.com/photos/34924813/pexels-photo-34924813.jpeg";
const HAND_PLANT = "https://images.pexels.com/photos/1072824/pexels-photo-1072824.jpeg";
// Prayer beads, no hands — approved in review over the earlier hands-raised photo.
const DUA_BEADS = "https://images.pexels.com/photos/8522614/pexels-photo-8522614.jpeg";

const TOPIC_IMAGE: Record<string, string> = {
  "hardship and ease": HOURGLASS,
  "not burden a soul": HAND_PLANT,
  "do not approach zina": MOSQUE_DOOR,
  patience: HOURGLASS,
  gratitude: HAND_PLANT,
  "trust in Allah": FOREST_PATH,
  "mercy of Allah": LEAF,
  "kindness to parents": HAND_PLANT,
  "remembrance of Allah": MOSQUE_DOOR,
  "consultation and reliance": FOREST_PATH,
  "marriage and tranquility": LEAF,
  "humanity and nations": FOREST_PATH,
  "prayer and immorality": MOSQUE_DOOR,
  "the light verse": DUA_BEADS,
  "ease after hardship": HOURGLASS,
  "which favor will you deny": LEAF,
  "truth and patience": HOURGLASS,
  "satisfaction with Allah's plan": LEAF,
  "the unseen and knowledge": FOREST_PATH,
  "Surah Al-Kahf (Friday)": MOSQUE_DOOR,
};

const SOURCE_LABEL: Record<string, string> = {
  calendar: "This Friday",
  rare: "New to you",
  related: "Because you read this",
  random: "Discover",
  trending: "Trending",
};

/**
 * Signal-driven exploration section: calendar events, recent searches,
 * recent bookmarks, and per-topic engagement all feed into which six
 * topics show up here (see discoverEngine.ts).
 */
export function DiscoverMoreSection() {
  const { history } = useSearchHistory();
  const { bookmarks } = useBookmarks();
  const { engagement, recordEngagement } = useTopicEngagement();
  const [refreshKey, setRefreshKey] = useState(0);

  const cards = useMemo(
    () =>
      getDiscoverSuggestions({
        isJumuah,
        recentSearches: history,
        recentBookmarkSurahs: bookmarks.map((b) => b.surah),
        engagement,
        count: 6,
      }),
    // refreshKey intentionally forces recomputation on manual refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, bookmarks, engagement, refreshKey]
  );

  if (cards.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">Explore by Topic</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-primary-hover">View all</span>
          <IconButton size="sm" aria-label="Refresh suggestions" onClick={() => setRefreshKey((k) => k + 1)}>
            <RefreshCw />
          </IconButton>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {cards.map((card) => {
          const image = TOPIC_IMAGE[card.label] ?? LEAF;
          return (
            <Link
              key={card.label}
              href={`/ayah/${card.surah}/${card.ayah}`}
              onClick={() => recordEngagement(card.label)}
              className="group relative block h-24 overflow-hidden rounded-xl shadow-sm transition-transform duration-150 ease-out hover:-translate-y-0.5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt=""
                aria-hidden="true"
                className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105"
                style={{ filter: "saturate(0.82) contrast(1.04) brightness(0.97)" }}
              />
              <span
                className="absolute inset-0"
                style={{ background: "linear-gradient(to top, var(--image-overlay) 0%, transparent 75%)" }}
              />
              <span className="absolute inset-x-0 bottom-0 p-3">
                <span className="block text-[10px] font-medium uppercase tracking-wide text-white/70">
                  {SOURCE_LABEL[card.source]}
                </span>
                <span className="block truncate text-sm font-semibold capitalize text-white">{card.label}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
