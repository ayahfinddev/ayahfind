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
  audioActive?: boolean;
}

export function ReaderTopBar({
  surah, ayah, totalAyahs, nameEn, nameAr,
  mode, onModeChange,
  onPrevAyah, onNextAyah, onJumpAyah,
  onPrevSurah, onNextSurah, canPrevSurah, canNextSurah,
  onListenSurah, onSkipPrev, onSkipNext, isPlaying,
  canPrev, canNext, onOpenNavigator, audioActive,
}: ReaderTopBarProps) {
  const [jumpValue, setJumpValue] = useState(String(ayah));
  const showInlinePlayback = !audioActive;

  useEffect(() => { setJumpValue(String(ayah)); }, [ayah, surah]);

  const commitJump = () => {
    if (!onJumpAyah) return;
    const n = Math.min(totalAyahs, Math.max(1, parseInt(jumpValue, 10) || 1));
    setJumpValue(String(n));
    onJumpAyah(n);
  };

  return (
    <header className="reader-top-bar sticky top-safe z-40 -mx-4 border-b border-black/[0.06] bg-white/95 px-4 backdrop-blur-xl md:-mx-6 md:px-6 lg:-mx-10 lg:px-10">

      {/* Row 1 — title + controls */}
      <div className="flex items-center gap-2 py-3">
        <Link href="/" className="af-icon-btn shrink-0 !text-ink-muted" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ink">{nameEn}</p>
          <p className="truncate text-[11px] text-ink-subtle">{formatReaderMeta(surah, ayah, nameEn)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-0">
          {onOpenNavigator && (
            <button type="button" onClick={onOpenNavigator} className="af-icon-btn" aria-label="Navigator" title="Navigate (N)">
              <ListTree className="h-4 w-4" />
            </button>
          )}
          <button type="button" disabled={!canPrevSurah} onClick={onPrevSurah}
            className={cn("af-icon-btn", !canPrevSurah && "pointer-events-none opacity-25")} aria-label="Prev surah">
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button type="button" disabled={!canPrev} onClick={onPrevAyah}
            className={cn("af-icon-btn", !canPrev && "pointer-events-none opacity-25")} aria-label="Prev ayah">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" disabled={!canNext} onClick={onNextAyah}
            className={cn("af-icon-btn", !canNext && "pointer-events-none opacity-25")} aria-label="Next ayah">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" disabled={!canNextSurah} onClick={onNextSurah}
            className={cn("af-icon-btn", !canNextSurah && "pointer-events-none opacity-25")} aria-label="Next surah">
            <ChevronsRight className="h-4 w-4" />
          </button>
          {showInlinePlayback && onSkipPrev && (
            <button type="button" onClick={onSkipPrev} className="af-icon-btn" aria-label="Prev in recitation">
              <SkipBack className="h-4 w-4" />
            </button>
          )}
          {showInlinePlayback && onListenSurah && <ReaderReciterSelect />}
          {onListenSurah && (
            <button type="button" onClick={onListenSurah}
              className={cn("af-icon-btn", isPlaying ? "!text-accent-dim" : "hover:!text-accent-dim")}
              aria-label={isPlaying ? "Pause" : "Play from here"}>
              {isPlaying ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          )}
          {showInlinePlayback && onSkipNext && (
            <button type="button" onClick={onSkipNext} className="af-icon-btn" aria-label="Next in recitation">
              <SkipForward className="h-4 w-4" />
            </button>
          )}
          <Link href="/settings" className="af-icon-btn" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Row 2 — ayah counter + jump */}
      <div className="flex flex-wrap items-center gap-2 border-t border-black/[0.05] py-2">
        <span className="text-[11px] font-medium text-ink-subtle" aria-live="polite">
          {ayah} of {totalAyahs}
        </span>
        {onJumpAyah && (
          <div className="flex items-center gap-1">
            <label htmlFor="reader-ayah-jump" className="sr-only">Jump to ayah</label>
            <input
              id="reader-ayah-jump"
              type="number"
              min={1}
              max={totalAyahs}
              value={jumpValue}
              onChange={(e) => setJumpValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && commitJump()}
              className="w-12 rounded-lg border border-black/[0.08] bg-canvas px-2 py-0.5 text-center text-xs text-ink focus:border-accent-border focus:outline-none"
            />
            <button type="button" onClick={commitJump}
              className="rounded-lg bg-accent-dim px-2.5 py-0.5 text-xs font-semibold text-white transition-colors hover:brightness-105">
              Go
            </button>
          </div>
        )}
        <span className="ml-auto hidden text-[11px] text-ink-subtle sm:inline">Surah {surah}</span>
      </div>

      {/* Row 3 — reading mode + translation credit */}
      <div className="flex flex-col gap-2 border-t border-black/[0.05] py-2 sm:flex-row sm:items-center sm:justify-between">
        <ReadingModeToggle mode={mode} onChange={onModeChange} />
        <span className="text-[11px] text-ink-subtle">Sahih International</span>
      </div>
    </header>
  );
}
