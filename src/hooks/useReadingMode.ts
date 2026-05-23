"use client";

import { useCallback, useEffect, useState } from "react";

export type ReadingMode = "verse" | "arabic" | "translation" | "both";

const STORAGE_KEY = "ayahfind_reading_mode";

export function useReadingMode(defaultMode: ReadingMode = "verse") {
  const [mode, setModeState] = useState<ReadingMode>(defaultMode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ReadingMode | null;
      if (stored && ["verse", "arabic", "translation", "both"].includes(stored)) {
        setModeState(stored);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setMode = useCallback((next: ReadingMode) => {
    setModeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  return { mode, setMode, ready };
}