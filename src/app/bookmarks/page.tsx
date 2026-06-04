"use client";

import Link from "next/link";
import { BookMarked } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getSurahEntry } from "@/lib/quranNavigation";

export default function BookmarksPage() {
  const { bookmarks } = useBookmarks();

  return (
    <div className="px-1 pt-8 sm:px-5">
      <h1 className="text-2xl font-bold text-ink">Bookmarks</h1>
      <p className="mt-1 text-sm text-ink-muted">Ayahs you saved for later</p>
      {bookmarks.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center text-ink-subtle">
          <BookMarked className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">No bookmarks yet. Tap the bookmark icon on a result.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {bookmarks.map((b) => {
            const name = b.label || getSurahEntry(b.surah)?.en || `Surah ${b.surah}`;
            return (
              <li key={`${b.surah}-${b.ayah}`}>
                <Link
                  href={`/ayah/${b.surah}/${b.ayah}`}
                  className="glass-panel flex items-center justify-between px-4 py-3 text-sm text-ink hover:border-accent-border"
                >
                  <span className="font-medium">
                    {name} · {b.surah}:{b.ayah}
                  </span>
                  <span className="text-xs text-ink-muted">Open</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
