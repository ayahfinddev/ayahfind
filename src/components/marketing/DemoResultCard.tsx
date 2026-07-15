"use client";

import {
  BookOpen,
  Bookmark,
  BookOpenText,
  Copy,
  ExternalLink,
  Layers,
  Play,
  Share2,
  Sparkles,
} from "lucide-react";
import type { MarketingVerse } from "./verses";
import { cn } from "@/lib/utils";

interface DemoResultCardProps {
  verse: MarketingVerse;
  /** e.g. 0.96 → "96% match" */
  confidence?: number;
  /** Trim the action row on small embeds. */
  compact?: boolean;
  className?: string;
}

/** Static visual replica of the real AyahResultCard (see
 * src/components/results/AyahResultCard.tsx) — same layout, hierarchy and
 * action row, but presentational only: no audio context, bookmarks, tafsir
 * fetches or navigation. The Arabic and translation passed in are real
 * corpus text (see verses.ts), never placeholders. */
export function DemoResultCard({ verse, confidence = 0.96, compact, className }: DemoResultCardProps) {
  return (
    <article
      aria-label={`Search result: Qur'an ${verse.surah}:${verse.ayah}, Surah ${verse.surahName}`}
      className={cn(
        "relative rounded-xl border border-border bg-surface p-5 text-left shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-tertiary">
            Surah {verse.surah} · Ayah {verse.ayah}
          </p>
          <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-accent-dim px-2.5 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3 w-3" />
            {Math.round(confidence * 100)}% match
          </span>
        </div>
        <span className="rounded-lg p-1.5 text-text-tertiary" aria-hidden="true">
          <ExternalLink className="h-4 w-4" />
        </span>
      </div>

      <p
        className={cn(
          "font-arabic mt-5 text-right text-text",
          compact ? "text-[1.35rem] leading-[1.9]" : "text-arabic-md"
        )}
        dir="rtl"
        lang="ar"
      >
        {verse.textAr}
      </p>

      <p className="mt-3 text-body-sm text-text-secondary">{verse.translationEn}</p>

      <div
        aria-hidden="true"
        className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-3.5"
      >
        <span className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white">
          <BookOpen className="h-3.5 w-3.5" />
          Continue reading
        </span>
        <span className="flex items-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
          <Play className="h-3.5 w-3.5" />
          Listen
        </span>
        {!compact && (
          <>
            <span className="flex items-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
              <BookOpenText className="h-3.5 w-3.5" />
              Tafsir
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-surface-secondary px-3 py-1.5 text-xs font-medium text-text-secondary">
              <Layers className="h-3.5 w-3.5" />
              Qira&rsquo;at
            </span>
          </>
        )}
        <span className="ml-auto flex items-center gap-1 text-text-tertiary">
          <Bookmark className="h-4 w-4" />
          <Copy className="ml-2 h-4 w-4" />
          <Share2 className="ml-2 h-4 w-4" />
        </span>
      </div>
    </article>
  );
}
