"use client";

import { useCallback, useEffect, useState } from "react";

export type Bookmark = {
  surah: number;
  ayah: number;
  label?: string;
  savedAt: number;
};

const STORAGE_KEY = "ayahfind_bookmarks";

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setBookmarks(JSON.parse(raw) as Bookmark[]);
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: Bookmark[]) => {
    setBookmarks(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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