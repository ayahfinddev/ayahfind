"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ayahfind_history";
const REFS_STORAGE_KEY = "ayahfind_history_refs";
const MAX_ENTRIES = 20;
// The native `storage` event never fires in the document that made the
// write, so SearchExperience's addQuery() and RecentSearchesCard's own
// useSearchHistory() instance — both mounted on the homepage at once —
// would otherwise drift out of sync until a full reload.
const SYNC_EVENT = "ayahfind:history-changed";

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

/** query -> a short reference label ("Qur'an 39:53", "Hadith") shown next
 * to Recent Searches rows when known. Kept in its own storage key so the
 * existing `history: string[]` shape (consumed by /history and Discover's
 * signal engine) never changes. */
function readStoredRefs(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(REFS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);
  const [historyRefs, setHistoryRefs] = useState<Record<string, string>>({});

  useEffect(() => {
    setHistory(readStored());
    setHistoryRefs(readStoredRefs());
    const onSync = () => {
      setHistory(readStored());
      setHistoryRefs(readStoredRefs());
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const addQuery = useCallback((query: string, ref?: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    try {
      const current = readStored();
      const next = [trimmed, ...current.filter((h) => h !== trimmed)].slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setHistory(next);

      if (ref) {
        const currentRefs = readStoredRefs();
        const nextRefs = { ...currentRefs, [trimmed]: ref };
        // Prune refs for queries that fell off the history list.
        for (const key of Object.keys(nextRefs)) {
          if (!next.includes(key)) delete nextRefs[key];
        }
        localStorage.setItem(REFS_STORAGE_KEY, JSON.stringify(nextRefs));
        setHistoryRefs(nextRefs);
      }
      window.dispatchEvent(new Event(SYNC_EVENT));
    } catch {
      /* ignore quota */
    }
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(REFS_STORAGE_KEY);
      window.dispatchEvent(new Event(SYNC_EVENT));
    } catch {
      /* ignore */
    }
    setHistory([]);
    setHistoryRefs({});
  }, []);

  return { history, historyRefs, addQuery, clear };
}
