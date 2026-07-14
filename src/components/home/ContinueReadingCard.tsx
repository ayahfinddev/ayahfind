"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useReciter } from "@/hooks/useReciter";
import { getJuzForRef } from "@/lib/quranNavigation";
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

/** The homepage's centerpiece card — the largest, most visually weighted
 * card on the page, in the spirit of Spotify's "Continue Listening" /
 * Kindle's "Continue Reading". Reuses `useReadingProgress` unchanged; only
 * the presentation grew to match its new prominence. Always renders
 * something (never a blank grid cell) — first-time users get a "start
 * reading" prompt. */
export function ContinueReadingCard() {
  const { progress } = useReadingProgress();
  const { reciter: currentReciter } = useReciter();

  if (!progress) {
    return (
      <ContentCard
        elevation="elevated"
        padding="md"
        className="relative flex flex-col justify-center gap-5 overflow-hidden rounded-[20px] p-5 shadow-md sm:min-h-[190px] sm:flex-row sm:items-center"
        style={{ background: "linear-gradient(155deg, rgba(212,175,55,0.08), transparent 50%), var(--surface-elevated)" }}
      >
        <div className="h-24 w-24 shrink-0 self-start overflow-hidden rounded-2xl shadow-sm ring-1 ring-gold/20 sm:h-[160px] sm:w-[160px]">
          <SurahCoverArt className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary-hover">Continue reading</span>
          <h2 className="mt-1 font-serif text-2xl font-semibold text-text">Start your reading journey</h2>
          <p className="mt-1 text-sm text-text-secondary">Pick up from Al-Fatiha, or search for a verse above.</p>
          <Link
            href="/ayah/1/1"
            className="mt-3 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors duration-150 ease-out hover:bg-primary-hover"
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

  return (
    <ContentCard
      elevation="elevated"
      padding="md"
      className="group relative overflow-hidden rounded-[20px] p-3.5 shadow-md ring-1 ring-gold/[0.08] transition-all duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:min-h-[176px]"
      style={{ background: "linear-gradient(155deg, rgba(212,175,55,0.08), transparent 50%), var(--surface-elevated)" }}
    >
      {/* Quiet gold hairline marking this as the centerpiece */}
      <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-gold via-[#f3d38a] to-primary opacity-80" />

      <div className="flex flex-col gap-3 sm:h-full sm:flex-row sm:items-center">
        {/* Illustrated "cover art" — a Spotify/Kindle-style visual anchor */}
        <div className="h-24 w-24 shrink-0 self-start overflow-hidden rounded-2xl shadow-md ring-1 ring-gold/20 sm:h-32 sm:w-32 sm:self-center">
          <SurahCoverArt className="h-full w-full" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary-hover">
              Continue reading
            </span>
            <span className="shrink-0 text-xs text-text-tertiary">{formatRelativeTime(progress.updatedAt)}</span>
          </div>

          <h2 className="mt-1 truncate font-serif text-xl font-semibold text-text sm:text-[1.75rem]">
            {progress.nameEn} <span className="font-sans text-base text-text-tertiary">· {progress.surah}:{progress.ayah}</span>
          </h2>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-text-secondary">
            <span>Juz {juz}</span>
            <span className="text-text-tertiary">·</span>
            <span>{reciter.name}</span>
            {modeLabel && (
              <>
                <span className="text-text-tertiary">·</span>
                <span>{modeLabel}</span>
              </>
            )}
          </div>

          <div className="mt-2 flex items-center gap-3">
            <span className="block h-2.5 flex-1 overflow-hidden rounded-full bg-surface-secondary shadow-inner">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className="shrink-0 text-xs font-medium text-text-tertiary">{pct}%</span>
          </div>

          <Link
            href={href}
            className="mt-2 inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-sm transition-colors duration-150 ease-out hover:bg-primary-hover"
          >
            Resume Reading
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </ContentCard>
  );
}
