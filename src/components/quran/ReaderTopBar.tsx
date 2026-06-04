"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ListTree,
  Pause,
  Settings,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { ReaderReciterSelect } from "@/components/quran/ReaderReciterSelect";
import { ReadingModeToggle } from "@/components/quran/ReadingModeToggle";
import type { ReadingMode } from "@/hooks/useReadingMode";
import { formatReaderMeta } from "@/lib/surahMeta";
import { cn } from "@/lib/utils";

interface ReaderTopBarProps {
  surah: number;
  ayah: number;
  totalAyahs: number;
  nameEn: string;
  nameAr?: string;
  mode: ReadingMode;
  onModeChange: (m: ReadingMode) => void;
  onPrevAyah?: () => void;
  onNextAyah?: () => void;
  onJumpAyah?: (ayah: number) => void;
  onPrevSurah?: () => void;
  onNextSurah?: () => void;
  canPrevSurah?: boolean;
  canNextSurah?: boolean;
  onListenSurah?: () => void;
  onSkipPrev?: () => void;
  onSkipNext?: () => void;
  isPlaying?: boolean;
  canPrev: boolean;
  canNext: boolean;
  onOpenNavigator?: () => void;
  /** When true, playback controls live in the TilawahBar — hide them here. */
  audioActive?: boolean;
}

export function ReaderTopBar({
  surah,
  ayah,
  totalAyahs,
  nameEn,
  nameAr,
  mode,
  onModeChange,
  onPrevAyah,
  onNextAyah,
  onJumpAyah,
  onPrevSurah,
  onNextSurah,
  canPrevSurah,
  canNextSurah,
  onListenSurah,
  onSkipPrev,
  onSkipNext,
  isPlaying,
  canPrev,
  canNext,
  onOpenNavigator,
  audioActive,
}: ReaderTopBarProps) {
  const [jumpValue, setJumpValue] = useState(String(ayah));
  const showInlinePlayback = !audioActive;

  useEffect(() => {
    setJumpValue(String(ayah));
  }, [ayah, surah]);

  const commitJump = () => {
    if (!onJumpAyah) return;
    const n = Math.min(totalAyahs, Math.max(1, parseInt(jumpValue, 10) || 1));
    setJumpValue(String(n));
    onJumpAyah(n);
  };

  return (
    <header className="sticky top-safe z-40 -mx-5 border-b border-glass-border bg-glass-fill px-5 backdrop-blur-xl md:-mx-8 md:px-8">
      <div className="flex items-center gap-2 py-3">
        <Link href="/" className="af-icon-btn shrink-0" aria-label="Back to search">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{nameEn}</p>
          <p className="truncate text-xs text-ink-muted">
            {formatReaderMeta(surah, ayah, nameEn)}
          </p>
          {nameAr && (
            <p className="font-arabic truncate text-xs text-ink-muted" dir="rtl">
              {nameAr}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {onOpenNavigator && (
            <button
              type="button"
              onClick={onOpenNavigator}
              className="af-icon-btn"
              aria-label="Open Quran navigator"
              title="Navigate (N)"
            >
              <ListTree className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            disabled={!canPrevSurah}
            onClick={onPrevSurah}
            className={cn("af-icon-btn", !canPrevSurah && "pointer-events-none opacity-30")}
            aria-label="Previous surah"
            title="Previous surah"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">Previous surah</span>
          </button>
          <button
            type="button"
            disabled={!canPrev}
            onClick={onPrevAyah}
            className={cn("af-icon-btn", !canPrev && "pointer-events-none opacity-30")}
            aria-label="Previous ayah"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={!canNext}
            onClick={onNextAyah}
            className={cn("af-icon-btn", !canNext && "pointer-events-none opacity-30")}
            aria-label="Next ayah"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={!canNextSurah}
            onClick={onNextSurah}
            className={cn("af-icon-btn", !canNextSurah && "pointer-events-none opacity-30")}
            aria-label="Next surah"
            title="Next surah"
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Next surah</span>
          </button>
          {showInlinePlayback && onSkipPrev && (
            <button
              type="button"
              onClick={onSkipPrev}
              className="af-icon-btn"
              aria-label="Previous verse in recitation"
            >
              <SkipBack className="h-4 w-4" />
            </button>
          )}
          {showInlinePlayback && onListenSurah && <ReaderReciterSelect />}
          {onListenSurah && (
            <button
              type="button"
              onClick={onListenSurah}
              className={cn(
                "af-icon-btn",
                isPlaying
                  ? "bg-accent-teal/15 text-teal-800"
                  : "text-accent-teal-dim hover:bg-accent-teal/10 hover:text-teal-800"
              )}
              aria-label={isPlaying ? "Pause recitation" : "Play from current ayah"}
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
          )}
          {showInlinePlayback && onSkipNext && (
            <button
              type="button"
              onClick={onSkipNext}
              className="af-icon-btn"
              aria-label="Next verse in recitation"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          )}
          <Link href="/settings" className="af-icon-btn" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-glass-border py-2.5">
        <span
          className="rounded-lg bg-accent-surface px-2.5 py-1 text-xs font-semibold text-accent-dim"
          aria-live="polite"
        >
          Ayah {ayah} of {totalAyahs}
        </span>
        {onJumpAyah && (
          <div className="flex items-center gap-1.5">
            <label htmlFor="reader-ayah-jump" className="sr-only">
              Jump to ayah
            </label>
            <input
              id="reader-ayah-jump"
              type="number"
              min={1}
              max={totalAyahs}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitJump()}
              className="w-14 rounded-lg border border-border-strong bg-canvas px-2 py-1 text-center text-xs text-ink"
            />
            <button
              type="button"
              onClick={commitJump}
              className="rounded-lg bg-ink px-2.5 py-1 text-xs font-medium text-canvas"
            >
              Go
            </button>
          </div>
        )}
        <span className="ml-auto hidden text-xs text-ink-muted sm:inline">
          Surah {surah}
        </span>
      </div>

      <div className="flex flex-col gap-2 border-t border-glass-border py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <ReadingModeToggle mode={mode} onChange={onModeChange} />
        <span className="text-xs text-ink-muted">Sahih International</span>
      </div>
    </header>
  );
}
