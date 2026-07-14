"use client";

import { useCallback, useEffect, useState } from "react";
import { getSurahEntry } from "@/lib/quranNavigation";
import type { ReciterId } from "@/lib/reciters";
import type { ReadingMode } from "@/hooks/useReadingMode";

const STORAGE_KEY = "ayahfind_reading_progress";

export type ReadingProgress = {
  surah: number;
  ayah: number;
  nameEn: string;
  updatedAt: number;
  // Added later — always optional so pre-existing localStorage entries
  // (which lack these fields) keep loading without a migration step.
  reciterId?: ReciterId;
  readingMode?: ReadingMode;
  /** 0-100, this ayah's position within the surah at save time. */
  progressPercent?: number;
};

function readStored(): ReadingProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReadingProgress;
    if (
      !parsed ||
      typeof parsed.surah !== "number" ||
      typeof parsed.ayah !== "number" ||
      parsed.surah < 1 ||
      parsed.surah > 114
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export interface SaveProgressOptions {
  reciterId?: ReciterId;
  readingMode?: ReadingMode;
}

export function useReadingProgress() {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);

  useEffect(() => {
    setProgress(readStored());
  }, []);

  const saveProgress = useCallback(
    (surah: number, ayah: number, nameEn?: string, options?: SaveProgressOptions) => {
      const entry = getSurahEntry(surah);
      const totalAyahs = entry?.c;
      const next: ReadingProgress = {
        surah,
        ayah,
        nameEn: nameEn || entry?.en || `Surah ${surah}`,
        updatedAt: Date.now(),
        reciterId: options?.reciterId,
        readingMode: options?.readingMode,
        progressPercent: totalAyahs ? Math.round((ayah / totalAyahs) * 100) : undefined,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      setProgress(next);
    },
    []
  );

  const clearProgress = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setProgress(null);
  }, []);

  return { progress, saveProgress, clearProgress };
}
