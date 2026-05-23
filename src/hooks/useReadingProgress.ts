"use client";

import { useCallback, useEffect, useState } from "react";
import { getSurahEntry } from "@/lib/quranNavigation";

const STORAGE_KEY = "ayahfind_reading_progress";

export type ReadingProgress = {
  surah: number;
  ayah: number;
  nameEn: string;
  updatedAt: number;
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

export function useReadingProgress() {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);

  useEffect(() => {
    setProgress(readStored());
  }, []);

  const saveProgress = useCallback((surah: number, ayah: number, nameEn?: string) => {
    const entry = getSurahEntry(surah);
    const next: ReadingProgress = {
      surah,
      ayah,
      nameEn: nameEn || entry?.en || `Surah ${surah}`,
      updatedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
    setProgress(next);
  }, []);

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
