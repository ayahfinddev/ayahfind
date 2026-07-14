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
import { ActionBar } from "@/components/ui/ActionBar";
import { TafsirPanel } from "@/components/quran/TafsirPanel";
import { QiraatPanel } from "@/components/quran/QiraatPanel";
import { ReadingChips } from "@/components/quran/ReadingChips";
import type { SearchCandidate } from "@/lib/types";
import { useReciter } from "@/hooks/useReciter";
import { useReadingVariants } from "@/hooks/useReadingVariants";
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
  const readingVariants = useReadingVariants(result.surah, result.ayah);
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
        "group relative rounded-xl border border-border bg-surface p-5 transition-shadow duration-150 ease-out hover:-translate-y-0.5",
        isWeak ? "opacity-80 shadow-xs" : "shadow-sm hover:shadow-md"
      )}
    >
      {/* Subtle hover tint */}
      <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-accent-surface/30 to-transparent opacity-0 transition-opacity duration-150 ease-out group-hover:opacity-100" />

      <div className="relative flex flex-col">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
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
            className="rounded-lg p-1.5 text-text-tertiary transition-colors duration-150 ease-out hover:bg-surface-secondary hover:text-primary-hover"
            aria-label="Open in reader"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>

        {/* Arabic — the visually dominant element on this card */}
        <p
          className="font-arabic mt-5 text-right text-arabic-md text-text"
          dir="rtl"
        >
          {arabicDisplay}
        </p>

        {/* Reading chips — descriptive only, never a selector (see
            ReadingChips docblock). */}
        <ReadingChips
          data={readingVariants.data}
          isLoading={readingVariants.isLoading}
          isError={readingVariants.isError}
        />

        {/* Translation — secondary to Arabic */}
        {result.translation_en && (
          <p className="mt-3 text-body-sm text-text-secondary">
            {highlightText(result.translation_en, highlightQuery)}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3.5">
          <Link
            href={readerHref}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150 ease-out hover:bg-primary-hover"
          >
            <BookOpen className="h-3.5 w-3.5" />
            Continue reading
          </Link>
          <button
            type="button"
            onClick={togglePlay}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out",
              playing
                ? "bg-accent-surface text-primary-hover"
                : "bg-surface-secondary text-text-secondary hover:text-text"
            )}
          >
            {playing ? <Volume2 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Stop" : "Listen"}
          </button>
          <TafsirPanel surah={result.surah} ayah={result.ayah} variant="pill" />
          <QiraatPanel
            surah={result.surah}
            ayah={result.ayah}
            data={readingVariants.data}
            isLoading={readingVariants.isLoading}
            isError={readingVariants.isError}
          />
          <ActionBar
            className="ml-auto"
            items={[
              {
                key: "bookmark",
                icon: <Bookmark className={cn(saved && "fill-current")} />,
                label: "Save",
                onClick: () => toggle(result.surah, result.ayah),
                active: saved,
              },
              { key: "copy", icon: <Copy />, label: "Copy", onClick: copyVerse },
              { key: "share", icon: <Share2 />, label: "Share", onClick: shareVerse },
            ]}
          />
        </div>
      </div>
    </motion.article>
  );
}
