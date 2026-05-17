"use client";

import { Bookmark, Copy, Pause, Play, Share2 } from "lucide-react";
import { useAudioPlayback, type QueueItem } from "@/contexts/AudioPlaybackContext";
import type { ReadingMode } from "@/hooks/useReadingMode";
import type { AyahDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

interface VerseCardProps {
  surah: number;
  ayah: AyahDetail;
  mode: ReadingMode;
  active: boolean;
  highlighted: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onSelectAyah: (ayah: number) => void;
  audioQueue: QueueItem[];
  audioQueueIndex: number;
  isLast?: boolean;
}

export function VerseCard(props: VerseCardProps) {
  const {
    surah,
    ayah,
    mode,
    active,
    highlighted,
    saved,
    onToggleSave,
    onSelectAyah,
    audioQueue,
    audioQueueIndex,
    isLast,
  } = props;

  const playback = useAudioPlayback();
  const playing = playback.isActiveVerse(surah, ayah.ayah);
  const showArabic = mode === "verse" || mode === "both" || mode === "arabic";
  const showTranslation = mode === "verse" || mode === "both" || mode === "translation";

  const toggleListen = () => {
    playback.toggleQueue(audioQueue, audioQueueIndex);
  };

  const copyVerse = async () => {
    const text = [ayah.text_ar, ayah.translation_en, `Surah ${surah}:${ayah.ayah}`]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const shareVerse = async () => {
    const url = `${window.location.origin}/ayah/${surah}/${ayah.ayah}`;
    try {
      if (navigator.share) await navigator.share({ title: `Quran ${surah}:${ayah.ayah}`, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* ignore */
    }
  };

  return (
    <article
      id={`ayah-${ayah.ayah}`}
      className={cn(
        "scroll-mt-28 overflow-visible px-5 py-7 transition-colors md:px-8 md:py-9",
        !isLast && "border-b border-neutral-100",
        highlighted && "reader-highlight",
        active ? "bg-accent-teal/[0.04]" : "bg-white hover:bg-neutral-50/80"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelectAyah(ayah.ayah)}
          className="text-xs font-semibold uppercase tracking-wider text-neutral-600 hover:text-accent-teal-dim"
        >
          {surah}:{ayah.ayah}
        </button>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={toggleListen}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors",
              playing
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200"
            )}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={onToggleSave}
            className={cn("af-icon-btn", saved && "text-accent-teal")}
            aria-label="Bookmark"
          >
            <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
          </button>
          <button type="button" onClick={copyVerse} className="af-icon-btn" aria-label="Copy">
            <Copy className="h-4 w-4" />
          </button>
          <button type="button" onClick={shareVerse} className="af-icon-btn" aria-label="Share">
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showArabic && (
        <p
          className={cn(
            "font-arabic break-words text-neutral-900",
            mode === "arabic"
              ? "mt-3 text-center text-[1.75rem] leading-[2.35] md:text-[2rem] md:leading-[2.5]"
              : "mt-5 text-right text-[1.5rem] leading-[2.25] md:text-[1.65rem] md:leading-[2.35]"
          )}
          dir="rtl"
          lang="ar"
        >
          {ayah.text_ar}
        </p>
      )}

      {showTranslation && ayah.translation_en && (
        <p
          className={cn(
            "break-words leading-relaxed text-neutral-700",
            mode === "verse" || mode === "both"
              ? "mt-4 text-sm md:text-[0.9375rem]"
              : "mt-3 text-base md:text-lg"
          )}
        >
          {ayah.translation_en}
        </p>
      )}

    </article>
  );
}
