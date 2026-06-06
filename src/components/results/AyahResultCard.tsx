"use client";

import { useAudioPlayback } from "@/contexts/AudioPlaybackContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Bookmark,
  ChevronRight,
  Copy,
  ExternalLink,
  Play,
  Share2,
  Volume2,
} from "lucide-react";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
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
    } catch {
      /* ignore */
    }
  };

  const shareVerse = async () => {
    const url = `${window.location.origin}${readerHref}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Qur'an ${result.surah}:${result.ayah}`,
          text: result.translation_en ?? undefined,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: noStagger ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: noStagger ? 0 : index * 0.06, duration: 0.3 }}
      className={cn(
        "group relative rounded-2xl border p-5 shadow-card backdrop-blur-md transition-transform hover:-translate-y-0.5",
        isWeak
          ? "border-border-strong bg-canvas-elevated opacity-90"
          : "border-glass-border bg-canvas-elevated"
      )}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 rounded-2xl bg-gradient-to-br from-accent-surface to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="relative z-20 flex flex-col">
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
              Surah {result.surah} · Ayah {result.ayah}
            </p>
            <ConfidenceBadge
              score={result.confidence}
              className="mt-2"
              tier={isWeak ? "weak" : undefined}
            />
          </div>
          <Link
            href={readerHref}
            className="relative z-20 rounded-lg p-2 text-ink-muted hover:bg-canvas-card hover:text-accent-dim"
            aria-label="Open in reader"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>

        <p
          className="font-arabic pointer-events-none relative mt-4 text-right text-[1.35rem] leading-loose text-ink"
          dir="rtl"
        >
          {arabicDisplay}
        </p>

        {result.translation_en && (
          <p className="pointer-events-none mt-3 text-sm leading-relaxed text-ink-muted">
            {highlightText(result.translation_en, highlightQuery)}
          </p>
        )}

        <div className="relative z-20 mt-4 flex flex-wrap items-center gap-2 border-t border-glass-border pt-4">
          <Link
            href={readerHref}
            className="relative z-20 flex cursor-pointer items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-canvas shadow-[0_0_16px_var(--accent-surface)] hover:brightness-110"
          >
            <BookOpen className="h-4 w-4" />
            Continue reading
          </Link>
          <Link
            href={readerHref}
            className="relative z-20 flex cursor-pointer items-center gap-2 rounded-xl border border-border-strong bg-canvas px-3 py-2 text-sm font-medium text-ink hover:border-accent-border"
          >
            <ExternalLink className="h-4 w-4" />
            Open in reader
          </Link>
          <button
            type="button"
            onClick={togglePlay}
            className={cn(
              "relative z-20 flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
              playing
                ? "bg-ink text-canvas"
                : "bg-canvas-card text-ink-muted hover:text-ink"
            )}
          >
            {playing ? <Volume2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {playing ? "Stop" : "Listen"}
          </button>
          <button
            type="button"
            onClick={() => toggle(result.surah, result.ayah)}
            className={cn(
              "relative z-20 cursor-pointer rounded-xl p-2 transition-colors",
              saved ? "text-accent" : "text-ink-subtle hover:bg-canvas-card"
            )}
            aria-label="Save"
          >
            <Bookmark className={cn("h-4 w-4", saved && "fill-current")} />
          </button>
          <button
            type="button"
            onClick={copyVerse}
            className="relative z-20 cursor-pointer rounded-xl p-2 text-ink-subtle hover:bg-canvas-card"
            aria-label="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={shareVerse}
            className="relative z-20 cursor-pointer rounded-xl p-2 text-ink-subtle hover:bg-canvas-card"
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}