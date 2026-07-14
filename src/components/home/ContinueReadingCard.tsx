"use client";

import Link from "next/link";
import { ArrowRight, Clock, Headphones, MoreHorizontal, Type } from "lucide-react";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useReciter } from "@/hooks/useReciter";
import { getJuzForRef, getSurahEntry } from "@/lib/quranNavigation";
import { getReciterById } from "@/lib/reciters";
import { formatRelativeTime } from "@/lib/utils";
import { ContentCard } from "@/components/ui/ContentCard";
import { SurahCoverArt } from "@/components/home/SurahCoverArt";
import type { ReadingMode } from "@/hooks/useReadingMode";

const MODE_LABEL: Record<ReadingMode, string> = {
  verse: "Arabic & translation",
  both: "Arabic & translation",
  arabic: "Arabic only",
  translation: "Translation only",
};

/** The homepage's centerpiece — largest, most visually weighted card. */
export function ContinueReadingCard() {
  const { progress } = useReadingProgress();
  const { reciter: currentReciter } = useReciter();

  if (!progress) {
    return (
      <ContentCard
        elevation="elevated"
        padding="sm"
        className="relative flex h-full flex-col justify-center gap-4 overflow-hidden rounded-2xl p-4.5 shadow-md sm:flex-row sm:items-center"
      >
        <SurahCoverArt
          nameAr={getSurahEntry(1)?.ar ?? "الفاتحة"}
          className="h-24 w-24 shrink-0 self-start overflow-hidden rounded-2xl shadow-sm sm:h-40 sm:w-40 sm:self-center"
        />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary-hover">Continue reading</span>
          <h2 className="mt-1 text-2xl font-semibold text-text">Start your reading journey</h2>
          <p className="mt-1 text-sm text-text-secondary">Pick up from Al-Fatiha, or search for a verse above.</p>
          <Link
            href="/ayah/1/1"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 ease-out hover:bg-primary-hover"
          >
            Start reading
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </ContentCard>
    );
  }

  const juz = getJuzForRef(progress.surah, progress.ayah);
  const href = `/ayah/${progress.surah}/${progress.ayah}`;
  const reciter = progress.reciterId ? getReciterById(progress.reciterId) : currentReciter;
  const modeLabel = progress.readingMode ? MODE_LABEL[progress.readingMode] : null;
  const pct = progress.progressPercent ?? 0;
  const surahAr = getSurahEntry(progress.surah)?.ar;

  return (
    <ContentCard
      elevation="elevated"
      padding="sm"
      className="relative h-full overflow-hidden rounded-2xl p-4.5 shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text">Continue Reading</h2>
        <MoreHorizontal className="h-4.5 w-4.5 text-text-tertiary" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {surahAr ? (
          <SurahCoverArt
            nameAr={surahAr}
            className="h-32 w-32 shrink-0 overflow-hidden rounded-2xl shadow-sm"
          />
        ) : (
          <div className="h-32 w-32 shrink-0 rounded-2xl bg-surface-secondary shadow-sm" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-2xl font-semibold text-text">{progress.nameEn}</h3>
          </div>
          <p className="mt-0.5 text-sm text-text-secondary">
            Verse {progress.ayah} of {getSurahEntry(progress.surah)?.c ?? "—"} · Juz {juz}
          </p>

          <div className="mt-1.5 flex items-center gap-3">
            <span className="block h-2 flex-1 overflow-hidden rounded-full bg-surface-secondary">
              <span className="block h-full rounded-full bg-primary transition-[width] duration-200 ease-out" style={{ width: `${pct}%` }} />
            </span>
            <span className="shrink-0 text-xs font-medium text-text-tertiary">{pct}%</span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs text-text-secondary">
              <Headphones className="h-3 w-3" /> {reciter.name}
            </span>
            {modeLabel && (
              <span className="flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs text-text-secondary">
                <Type className="h-3 w-3" /> {modeLabel}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-full bg-surface-secondary px-2.5 py-0.5 text-xs text-text-secondary">
              <Clock className="h-3 w-3" /> {formatRelativeTime(progress.updatedAt)}
            </span>
          </div>

          <Link
            href={href}
            className="mt-2.5 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 ease-out hover:bg-primary-hover"
          >
            Resume Reading
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </ContentCard>
  );
}
