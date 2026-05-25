"use client";

import { BookMarked } from "lucide-react";

export default function BookmarksPage() {
  return (
    <div className="px-1 pt-8 sm:px-5">
      <h1 className="text-2xl font-bold text-ink">Bookmarks</h1>
      <p className="mt-1 text-sm text-ink-muted">Ayahs you saved for later</p>
      <div className="mt-12 flex flex-col items-center text-center text-ink-subtle">
        <BookMarked className="mb-3 h-10 w-10 opacity-40" />
        <p className="text-sm">No bookmarks yet. Tap the bookmark icon on a result.</p>
      </div>
    </div>
  );
}
