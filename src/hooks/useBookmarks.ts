"use client";

import { useCallback, useEffect, useState } from "react";

export type Bookmark = {
  surah: number;
  ayah: number;
  label?: string;
  savedAt: number;
};

const STORAGE_KEY = "ayahfind_bookmarks";
// The native `storage` event only fires in *other* tabs/documents, never the
// one that made the write — so two components on the same page (e.g. Daily
// Reflection's bookmark toggle and the Bookmarked Ayahs list) each holding
// their own useBookmarks() instance would otherwise drift out of sync until
// a full reload. This custom event keeps every instance on the same page current.
const SYNC_EVENT = "ayahfind:bookmarks-changed";

function readStored(): Bookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    setBookmarks(readStored());
    const onSync = () => setBookmarks(readStored());
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const persist = useCallback((next: Bookmark[]) => {
    setBookmarks(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SYNC_EVENT));
    } catch {
      /* ignore */
    }
  }, []);

  const isSaved = useCallback(
    (surah: number, ayah: number) =>
      bookmarks.some((b) => b.surah === surah && b.ayah === ayah),
    [bookmarks]
  );

  const toggle = useCallback(
    (surah: number, ayah: number, label?: string) => {
      const exists = bookmarks.find((b) => b.surah === surah && b.ayah === ayah);
      if (exists) {
        persist(bookmarks.filter((b) => !(b.surah === surah && b.ayah === ayah)));
        return false;
      }
      persist([
        { surah, ayah, label, savedAt: Date.now() },
        ...bookmarks,
      ].slice(0, 100));
      return true;
    },
    [bookmarks, persist]
  );

  return { bookmarks, isSaved, toggle };
}