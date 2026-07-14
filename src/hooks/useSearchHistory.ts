"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ayahfind_history";
const MAX_ENTRIES = 20;

function readStored(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(readStored());
  }, []);

  const addQuery = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const current = readStored();
      const next = [trimmed, ...current.filter((h) => h !== trimmed)].slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setHistory(next);
    } catch {
      /* ignore quota */
    }
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setHistory([]);
  }, []);

  return { history, addQuery, clear };
}
