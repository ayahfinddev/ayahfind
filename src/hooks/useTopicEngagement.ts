"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ayahfind_topic_engagement";

export type EngagementMap = Record<string, { views: number; lastSeen: number }>;

function readStored(): EngagementMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

/** Tracks which Discover More / topic-chip labels the user has actually
 * opened, so the discover engine can surface topics they rarely explore. */
export function useTopicEngagement() {
  const [engagement, setEngagement] = useState<EngagementMap>({});

  useEffect(() => {
    setEngagement(readStored());
  }, []);

  const recordEngagement = useCallback((label: string) => {
    try {
      const current = readStored();
      const prev = current[label];
      const next: EngagementMap = {
        ...current,
        [label]: { views: (prev?.views ?? 0) + 1, lastSeen: Date.now() },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setEngagement(next);
    } catch {
      /* ignore quota */
    }
  }, []);

  return { engagement, recordEngagement };
}

/** Pure helper: given all candidate labels, returns the least-viewed first
 * (never-viewed topics sort before any viewed ones). */
export function getRareTopics(allLabels: string[], engagement: EngagementMap, count: number): string[] {
  return [...allLabels]
    .sort((a, b) => (engagement[a]?.views ?? 0) - (engagement[b]?.views ?? 0))
    .slice(0, count);
}
