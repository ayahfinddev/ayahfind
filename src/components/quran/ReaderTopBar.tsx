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
import { IconButton } from "@/components/ui/IconButton";
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
    <header className="reader-top-bar sticky top-safe z-40 -mx-4 border-b border-border bg-surface/95 px-4 backdrop-blur-xl md:-mx-6 md:px-6 lg:-mx-10 lg:px-10">

      {/* Row 1 — title + controls */}
      <div className="flex items-center gap-2 py-2.5">
        <Link href="/home" className="af-icon-btn h-9 w-9 shrink-0 text-text-secondary" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text">{nameEn}</p>
          <p className="truncate text-xs text-text-tertiary">{formatReaderMeta(surah, ayah, nameEn)}</p>
        </div>

        <div className="hide-scrollbar flex max-w-[60vw] shrink-0 items-center gap-0 overflow-x-auto sm:max-w-none">
          {onOpenNavigator && (
            <IconButton size="sm" onClick={onOpenNavigator} aria-label="Navigator" title="Navigate (N)">
              <ListTree />
            </IconButton>
          )}
          <IconButton size="sm" disabled={!canPrevSurah} onClick={onPrevSurah} aria-label="Prev surah">
            <ChevronsLeft />
          </IconButton>
          <IconButton size="sm" disabled={!canPrev} onClick={onPrevAyah} aria-label="Prev ayah">
            <ChevronLeft />
          </IconButton>
          <IconButton size="sm" disabled={!canNext} onClick={onNextAyah} aria-label="Next ayah">
            <ChevronRight />
          </IconButton>
          <IconButton size="sm" disabled={!canNextSurah} onClick={onNextSurah} aria-label="Next surah">
            <ChevronsRight />
          </IconButton>
          {showInlinePlayback && onSkipPrev && (
            <IconButton size="sm" onClick={onSkipPrev} aria-label="Prev in recitation">
              <SkipBack />
            </IconButton>
          )}
          {showInlinePlayback && onListenSurah && <ReaderReciterSelect />}
          {onListenSurah && (
            <IconButton
              size="sm"
              onClick={onListenSurah}
              active={isPlaying}
              aria-label={isPlaying ? "Pause" : "Play from here"}
            >
              {isPlaying ? <Pause /> : <Volume2 />}
            </IconButton>
          )}
          {showInlinePlayback && onSkipNext && (
            <IconButton size="sm" onClick={onSkipNext} aria-label="Next in recitation">
              <SkipForward />
            </IconButton>
          )}
          <Link href="/settings" className="af-icon-btn h-9 w-9" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Row 2 — ayah counter + jump */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border py-2">
        <span className="text-xs font-medium text-text-tertiary" aria-live="polite">
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
              className="w-12 rounded-lg border border-border-strong bg-background px-2 py-0.5 text-center text-xs text-text focus:border-accent-border focus:outline-none"
            />
            <button type="button" onClick={commitJump}
              className="rounded-lg bg-primary px-2.5 py-0.5 text-xs font-semibold text-white transition-colors hover:bg-primary-hover">
              Go
            </button>
          </div>
        )}
        <span className="ml-auto hidden text-xs text-text-tertiary sm:inline">Surah {surah}</span>
      </div>

      {/* Row 3 — reading mode + translation credit */}
      <div className="flex flex-col gap-2 border-t border-border py-2 sm:flex-row sm:items-center sm:justify-between">
        <ReadingModeToggle mode={mode} onChange={onModeChange} />
        <span className="text-xs text-text-tertiary">Sahih International</span>
      </div>
    </header>
  );
}
