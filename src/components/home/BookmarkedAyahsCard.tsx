"use client";

import { BookMarked } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getSurahEntry } from "@/lib/quranNavigation";
import { ListRow } from "@/components/ui/ListRow";
import { ContentCard } from "@/components/ui/ContentCard";

export function BookmarkedAyahsCard() {
  const { bookmarks } = useBookmarks();

  return (
    <ContentCard elevation="surface" padding="sm" className="min-h-[160px] rounded-[20px] p-3.5">
      <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
        Bookmarked ayahs
      </h2>
      {bookmarks.length === 0 ? (
        <p className="text-sm text-text-tertiary">Tap the bookmark icon on a verse to save it here.</p>
      ) : (
        <div className="space-y-1.5">
          {bookmarks.slice(0, 3).map((b) => {
            const name = b.label || getSurahEntry(b.surah)?.en || `Surah ${b.surah}`;
            return (
              <ListRow
                key={`${b.surah}-${b.ayah}`}
                icon={<BookMarked className="h-4 w-4" />}
                title={name}
                subtitle={`${b.surah}:${b.ayah}`}
                href={`/ayah/${b.surah}/${b.ayah}`}
                className="h-10 rounded-2xl"
              />
            );
          })}
        </div>
      )}
    </ContentCard>
  );
}
