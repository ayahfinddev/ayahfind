"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { fetchReader } from "@/lib/api";
import { ContentCard } from "@/components/ui/ContentCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

const VISIBLE_COUNT = 4;

export function BookmarkedAyahsCard() {
  const { bookmarks } = useBookmarks();
  const visible = bookmarks.slice(0, VISIBLE_COUNT);
  const [textBySurah, setTextBySurah] = useState<Record<number, Record<number, string>>>({});
  const [loading, setLoading] = useState(visible.length > 0);

  useEffect(() => {
    if (visible.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const surahs = Array.from(new Set(visible.map((b) => b.surah)));
    Promise.all(surahs.map((s) => fetchReader(s).then((r) => [s, r] as const).catch(() => null)))
      .then((results) => {
        if (cancelled) return;
        const next: Record<number, Record<number, string>> = {};
        for (const entry of results) {
          if (!entry) continue;
          const [surah, data] = entry;
          next[surah] = {};
          for (const a of data.ayahs) next[surah][a.ayah] = a.text_ar;
        }
        setTextBySurah(next);
        setLoading(false);
      })
      .catch(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible.map((b) => `${b.surah}:${b.ayah}`).join(",")]);

  return (
    <ContentCard elevation="surface" padding="sm" className="h-full rounded-2xl p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">Bookmarked Ayahs</h2>
        <Link href="/bookmarks" className="text-xs font-medium text-primary-hover hover:underline">
          View all
        </Link>
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-text-tertiary">Tap the bookmark icon on a verse to save it here.</p>
      ) : loading ? (
        <SkeletonCard />
      ) : (
        <div className="divide-y divide-border">
          {visible.map((b) => {
            const textAr = textBySurah[b.surah]?.[b.ayah];
            return (
              <Link
                key={`${b.surah}-${b.ayah}`}
                href={`/ayah/${b.surah}/${b.ayah}`}
                className="flex items-center gap-2.5 py-1.5 text-sm transition-colors duration-150 ease-out first:pt-0 last:pb-0 hover:bg-surface-secondary"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent-surface text-primary-hover">
                  <Bookmark className="h-3.5 w-3.5" fill="currentColor" />
                </span>
                {textAr ? (
                  <span dir="rtl" lang="ar" className="min-w-0 flex-1 truncate font-arabic text-lg text-text">
                    {textAr}
                  </span>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-text-secondary">
                    {b.label || `Surah ${b.surah}`}
                  </span>
                )}
                <span className="shrink-0 text-xs text-text-tertiary">{b.surah}:{b.ayah}</span>
              </Link>
            );
          })}
        </div>
      )}
    </ContentCard>
  );
}
