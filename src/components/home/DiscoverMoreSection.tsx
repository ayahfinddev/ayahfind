"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  CloudSun,
  Hourglass,
  Sparkles,
  Anchor,
  Leaf,
  Home,
  Moon,
  MessageCircle,
  HeartHandshake,
  Globe2,
  Sunrise,
  Flame,
  Wind,
  Gift,
  Compass,
  Smile,
  Eye,
  ShieldCheck,
  Feather,
  type LucideIcon,
} from "lucide-react";
import { getDiscoverSuggestions } from "@/lib/discoverEngine";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useTopicEngagement } from "@/hooks/useTopicEngagement";
import { ContentCard } from "@/components/ui/ContentCard";
import { IconButton } from "@/components/ui/IconButton";

const isJumuah = new Date().getDay() === 5;

// Each topic gets a distinct icon + a warm decorative color (not the app's
// interactive teal accent — this is illustration, chosen per meaning, e.g.
// hardship/ease reads as clearing weather, patience as an hourglass, mercy
// as a leaf — so cards read at a glance instead of all looking identical.
const TOPIC_META: Record<string, { icon: LucideIcon; color: string }> = {
  "hardship and ease": { icon: CloudSun, color: "#6b93a8" },
  "not burden a soul": { icon: Feather, color: "#6b8f71" },
  "do not approach zina": { icon: ShieldCheck, color: "#8a5a52" },
  patience: { icon: Hourglass, color: "#caa14a" },
  gratitude: { icon: Sparkles, color: "#d4a843" },
  "trust in Allah": { icon: Anchor, color: "#2f6b52" },
  "mercy of Allah": { icon: Leaf, color: "#4f8f5f" },
  "kindness to parents": { icon: Home, color: "#c17f6b" },
  "remembrance of Allah": { icon: Moon, color: "#6b6ba8" },
  "consultation and reliance": { icon: MessageCircle, color: "#6b93a8" },
  "marriage and tranquility": { icon: HeartHandshake, color: "#c17f6b" },
  "humanity and nations": { icon: Globe2, color: "#4f8fa0" },
  "prayer and immorality": { icon: Sunrise, color: "#caa14a" },
  "the light verse": { icon: Flame, color: "#d4a843" },
  "ease after hardship": { icon: Wind, color: "#6b93a8" },
  "which favor will you deny": { icon: Gift, color: "#c17f6b" },
  "truth and patience": { icon: Compass, color: "#a86b3f" },
  "satisfaction with Allah's plan": { icon: Smile, color: "#4f8f5f" },
  "the unseen and knowledge": { icon: Eye, color: "#6b6ba8" },
  "Surah Al-Kahf (Friday)": { icon: Moon, color: "#2f6b52" },
};

const SOURCE_LABEL: Record<string, string> = {
  calendar: "This Friday",
  rare: "New to you",
  related: "Because you read this",
  random: "Discover",
  trending: "Trending",
};

const FALLBACK = { icon: Sparkles, color: "#caa14a" };

/**
 * Separate from the small static `SemanticChips` row under the search box:
 * this is a larger, rotating, signal-driven exploration section, not a
 * duplicate of the same "quick prompt" feature.
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
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-tertiary">Discover more</h2>
        <IconButton
          size="sm"
          aria-label="Refresh suggestions"
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          <RefreshCw />
        </IconButton>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((card) => {
          const meta = TOPIC_META[card.label] ?? FALLBACK;
          const Icon = meta.icon;
          return (
            <Link key={card.label} href={`/ayah/${card.surah}/${card.ayah}`} onClick={() => recordEngagement(card.label)}>
              <ContentCard
                elevation="surface"
                padding="sm"
                interactive
                className="relative h-[96px] overflow-hidden rounded-[20px] p-2"
                style={{
                  background: `linear-gradient(155deg, ${meta.color}1a, transparent 60%), var(--surface)`,
                  borderColor: `${meta.color}2e`,
                }}
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full blur-xl"
                  style={{ backgroundColor: `${meta.color}33` }}
                />
                <span
                  className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg shadow-sm"
                  style={{ backgroundColor: `${meta.color}22`, color: meta.color }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <p className="relative text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
                  {SOURCE_LABEL[card.source]}
                </p>
                <p className="relative mt-0.5 truncate text-sm font-semibold capitalize text-text">{card.label}</p>
                <p className="relative mt-0.5 text-[11px] text-text-tertiary">
                  Surah {card.surah}:{card.ayah}
                </p>
              </ContentCard>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
