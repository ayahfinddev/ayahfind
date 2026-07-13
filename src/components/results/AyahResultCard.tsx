"use client";

import { useAudioPlayback } from "@/contexts/AudioPlaybackContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Bookmark,
  Copy,
  ExternalLink,
  Play,
  Share2,
  Volume2,
} from "lucide-react";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { TafsirPanel } from "@/components/quran/TafsirPanel";
import type { SearchCandidate } from "@/lib/types";
import { useReciter } from "@/hooks/useReciter";
import { highlightText } from "@/lib/highlight";
import { displayArabicForResult } from "@/lib/quranDisplay";
import { buildAyahAudioSources } from "@/lib/reciters";
import { cn } from "@/lib/utils";

interface AyahResultCardProps {
  result: SearchCandidate;
  index: number;
  variant?: "default" | "weak";
  highlightQuery?: string;
  noStagger?: boolean;
}

export function AyahResultCard({
  result,
  index,
  variant = "default",
  highlightQuery = "",
  noStagger = false,
}: AyahResultCardProps) {
  const isWeak = variant === "weak";
  const { reciterId } = useReciter();
  const { isSaved, toggle } = useBookmarks();
  const saved = isSaved(result.surah, result.ayah);
  const { src, fallbackSrc } = buildAyahAudioSources(
    result.surah,
    result.ayah,
    reciterId,
    result.audio_url
  );
  const playback = useAudioPlayback();
  const playing = playback.isActiveVerse(result.surah, result.ayah);
  const togglePlay = () =>
    playback.toggleSingle(src, { surah: result.surah, ayah: result.ayah }, fallbackSrc);
  const readerHref = `/ayah/${result.surah}/${result.ayah}`;
  const arabicDisplay = displayArabicForResult(
    result.surah,
    result.ayah,
    result.text_ar,
    result.text_ar_display
  );

  const copyVerse = async () => {
    const text = [
      arabicDisplay,
      result.translation_en,
      `— Qur'an ${result.surah}:${result.ayah}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch { /* ignore */ }
  };

  const shareVerse = async () => {
    const url = `${window.location.origin}${readerHref}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Qur'an ${result.surah}:${result.ayah}`, text: result.translation_en ?? undefined, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch { /* ignore */ }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: noStagger ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: noStagger ? 0 : index * 0.055, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "group relative rounded-2xl bg-white p-5 transition-all duration-200 hover:-translate-y-0.5",
        isWeak
          ? "opacity-80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_3px_10px_rgba(0,0,0,0.04)]"
          : "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]"
      )}
    >
      {/* Subtle hover tint */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-accent-surface/30 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="relative flex flex-col">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
              Surah {result.surah} · Ayah {result.ayah}
            </p>
            <ConfidenceBadge
              score={result.confidence}
              className="mt-1.5"
              tier={isWeak ? "weak" : undefined}
            />
          </div>
          <Link
            href={readerHref}
            className="rounded-lg p-1.5 text-ink-subtle transition-colors hover:bg-canvas-card hover:text-accent-dim"
            aria-label="Open in reader"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        {/* Arabic */}
        <p
          className="font-arabic mt-5 text-right text-[1.6rem] leading-loose text-ink"
          dir="rtl"
        >
          {arabicDisplay}
        </p>

        {/* Translation */}
        {result.translation_en && (
          <p className="mt-3 text-[0.875rem] leading-relaxed text-ink-muted">
            {highlightText(result.translation_en, highlightQuery)}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-black/[0.05] pt-3.5">
          <Link
            href={readerHref}
            className="flex items-center gap-1.5 rounded-lg bg-accent-dim px-3 py-1.5 text-xs font-semibold text-white transition-all hover:brightness-105 hover:shadow-[0_2px_8px_rgba(13,148,136,0.3)]"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Continue reading
          </Link>
          <button
            type="button"
            onClick={togglePlay}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              playing
                ? "bg-accent-surface text-accent-dim"
                : "bg-canvas-card text-ink-muted hover:text-ink"
            )}
          >
            {playing ? <Volume2 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Stop" : "Listen"}
          </button>
          <TafsirPanel surah={result.surah} ayah={result.ayah} variant="pill" />
          <div className="ml-auto flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => toggle(result.surah, result.ayah)}
              className={cn(
                "rounded-lg p-1.5 transition-colors",
                saved ? "text-accent-dim" : "text-ink-subtle hover:bg-canvas-card hover:text-ink"
              )}
              aria-label="Save"
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
      </div>
    </motion.article>
  );
}
