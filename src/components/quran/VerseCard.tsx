"use client";

import { Bookmark, Copy, Pause, Play, Share2 } from "lucide-react";
import { useAudioPlayback, type QueueItem } from "@/contexts/AudioPlaybackContext";
import type { ReadingMode } from "@/hooks/useReadingMode";
import type { AyahDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnnotatedArabicText } from "@/components/quran/AnnotatedArabicText";

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
  const { surah, ayah, mode, active, highlighted, saved, onToggleSave, onSelectAyah, audioQueue, audioQueueIndex } = props;

  const playback = useAudioPlayback();
  const playing = playback.isActiveVerse(surah, ayah.ayah);
  const showArabic      = mode === "verse" || mode === "both" || mode === "arabic";
  const showTranslation = mode === "verse" || mode === "both" || mode === "translation";

  const toggleListen = () => playback.toggleQueue(audioQueue, audioQueueIndex);

  const copyVerse = async () => {
    const text = [ayah.text_ar, ayah.translation_en, `Surah ${surah}:${ayah.ayah}`]
      .filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  const shareVerse = async () => {
    const url = `${window.location.origin}/ayah/${surah}/${ayah.ayah}`;
    try {
      if (navigator.share) await navigator.share({ title: `Quran ${surah}:${ayah.ayah}`, url });
      else await navigator.clipboard.writeText(url);
    } catch { /* ignore */ }
  };

  return (
    <article
      id={`ayah-${ayah.ayah}`}
      className={cn(
        "reader-verse group scroll-mt-28 overflow-visible px-6 transition-all duration-200 md:px-10",
        "py-12 md:py-14",
        highlighted && "reader-highlight",
        active
          ? "is-active border-l-[3px] border-accent-dim pl-[21px] md:pl-[37px]"
          : "border-l-[3px] border-transparent pl-[21px] md:pl-[37px]",
        !active && "hover:bg-white/60"
      )}
    >
      {/* Top row: verse ref + action icons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onSelectAyah(ayah.ayah)}
          className="text-[11px] font-normal tracking-wide text-ink-subtle transition-colors hover:text-accent-dim"
        >
          {surah}:{ayah.ayah}
        </button>

        {/* Actions — appear on hover only */}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <button
            type="button"
            onClick={toggleListen}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              playing ? "text-accent-dim" : "text-ink-subtle hover:bg-canvas-card hover:text-ink"
            )}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={onToggleSave}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              saved ? "text-accent-dim" : "text-ink-subtle hover:bg-canvas-card hover:text-ink"
            )}
            aria-label="Bookmark"
          >
            <Bookmark className={cn("h-3.5 w-3.5", saved && "fill-current")} />
          </button>
          <button
            type="button"
            onClick={copyVerse}
            className="rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-canvas-card hover:text-ink"
            aria-label="Copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={shareVerse}
            className="rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-canvas-card hover:text-ink"
            aria-label="Share"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Arabic */}
      {showArabic && (
        <p
          className={cn(
            "reader-verse-arabic font-arabic break-words text-ink",
            mode === "arabic"
              ? "mt-5 text-center text-[2rem] leading-[2.35] md:text-[2.2rem] md:leading-[2.5]"
              : "mt-6 text-right text-[1.8rem] leading-[2.3] md:text-[1.95rem] md:leading-[2.45]"
          )}
          dir="rtl"
          lang="ar"
        >
          <AnnotatedArabicText text={ayah.text_ar} />
        </p>
      )}

      {/* Translation */}
      {showTranslation && ayah.translation_en && (
        <p
          className={cn(
            "reader-verse-translation break-words text-ink-muted",
            mode === "verse" || mode === "both"
              ? "mt-5 text-[0.9rem] leading-[1.75] md:text-[0.9375rem]"
              : "mt-4 text-base leading-relaxed md:text-lg"
          )}
        >
          {ayah.translation_en}
        </p>
      )}
    </article>
  );
}
