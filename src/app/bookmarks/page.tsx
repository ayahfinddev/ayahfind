"use client";

import { BookMarked } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getSurahEntry } from "@/lib/quranNavigation";
import { ListRow } from "@/components/ui/ListRow";

export default function BookmarksPage() {
  const { bookmarks } = useBookmarks();

  return (
    <div className="px-1 pt-8 sm:px-5">
      <h1 className="text-2xl font-bold text-text">Bookmarks</h1>
      <p className="mt-1 text-sm text-text-secondary">Ayahs you saved for later</p>
      {bookmarks.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center text-text-tertiary">
          <BookMarked className="mb-3 h-10 w-10 opacity-40" />
          <p className="text-sm">No bookmarks yet. Tap the bookmark icon on a result.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {bookmarks.map((b) => {
            const name = b.label || getSurahEntry(b.surah)?.en || `Surah ${b.surah}`;
            return (
              <li key={`${b.surah}-${b.ayah}`}>
                <ListRow
                  icon={<BookMarked className="h-4 w-4" />}
                  title={name}
                  subtitle={`${b.surah}:${b.ayah}`}
                  href={`/ayah/${b.surah}/${b.ayah}`}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
