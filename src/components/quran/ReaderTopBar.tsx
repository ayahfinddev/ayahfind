"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ListTree,
  Pause,
  Settings,
  SkipBack,
  SkipForward,
  Volume2,
} from "lucide-react";
import { ReadingModeToggle } from "@/components/quran/ReadingModeToggle";
import type { ReadingMode } from "@/hooks/useReadingMode";
import { formatReaderMeta } from "@/lib/surahMeta";
import { cn } from "@/lib/utils";

interface ReaderTopBarProps {
  surah: number;
  ayah: number;
  nameEn: string;
  nameAr?: string;
  mode: ReadingMode;
  onModeChange: (m: ReadingMode) => void;
  onPrevAyah?: () => void;
  onNextAyah?: () => void;
  onListenSurah?: () => void;
  onSkipPrev?: () => void;
  onSkipNext?: () => void;
  isPlaying?: boolean;
  canPrev: boolean;
  canNext: boolean;
  onOpenNavigator?: () => void;
}

export function ReaderTopBar({
  surah,
  ayah,
  nameEn,
  nameAr,
  mode,
  onModeChange,
  onPrevAyah,
  onNextAyah,
  onListenSurah,
  onSkipPrev,
  onSkipNext,
  isPlaying,
  canPrev,
  canNext,
  onOpenNavigator,
}: ReaderTopBarProps) {
  return (
    <header className="sticky top-0 z-40 -mx-5 border-b border-neutral-200 bg-white/95 px-5 backdrop-blur-xl md:-mx-8 md:px-8">
      <div className="flex items-center gap-2 py-3">
        <Link href="/" className="af-icon-btn shrink-0" aria-label="Back to search">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-neutral-900">{nameEn}</p>
          <p className="truncate text-xs text-neutral-500">
            {formatReaderMeta(surah, ayah, nameEn)}
          </p>
          {nameAr && (
            <p className="font-arabic truncate text-xs text-neutral-500" dir="rtl">
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
          {onSkipPrev && (
            <button
              type="button"
              onClick={onSkipPrev}
              className="af-icon-btn"
              aria-label="Previous verse in recitation"
            >
              <SkipBack className="h-4 w-4" />
            </button>
          )}
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
          {onSkipNext && (
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
      <div className="flex flex-col gap-2 border-t border-glass-border py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <ReadingModeToggle mode={mode} onChange={onModeChange} />
        <span className="text-xs text-neutral-500">Sahih International</span>
      </div>
    </header>
  );
}
