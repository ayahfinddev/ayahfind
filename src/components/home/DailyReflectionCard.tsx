"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sun, Bookmark, Copy, Share2, ArrowRight } from "lucide-react";
import { fetchReader } from "@/lib/api";
import { getTodaysReflection } from "@/lib/dailyReflection";
import { getSurahEntry } from "@/lib/quranNavigation";
import { useBookmarks } from "@/hooks/useBookmarks";
import { cn } from "@/lib/utils";
import type { AyahDetail } from "@/lib/types";
import { ContentCard } from "@/components/ui/ContentCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

export function DailyReflectionCard() {
  const ref = getTodaysReflection();
  const [ayah, setAyah] = useState<AyahDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isSaved, toggle } = useBookmarks();

  useEffect(() => {
    let cancelled = false;
    setAyah(null);
    setFailed(false);
    fetchReader(ref.surah)
      .then((data) => {
        if (cancelled) return;
        const found = data.ayahs.find((a) => a.ayah === ref.ayah) ?? null;
        setAyah(found);
        if (!found) setFailed(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.surah, ref.ayah]);

  if (failed) return null;
  if (!ayah) return <SkeletonCard />;

  const surahName = getSurahEntry(ref.surah)?.en ?? `Surah ${ref.surah}`;
  const href = `/ayah/${ref.surah}/${ref.ayah}`;
  const saved = isSaved(ref.surah, ref.ayah);

  const handleCopy = async () => {
    const text = ayah.translation_en ? `${ayah.text_ar}\n${ayah.translation_en}` : ayah.text_ar;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}${href}` : href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${surahName} ${ref.surah}:${ref.ayah}`, text: ayah.translation_en ?? ayah.text_ar, url });
      } catch {
        /* user cancelled — ignore */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <ContentCard elevation="surface" padding="sm" interactive className="relative flex h-full flex-col overflow-hidden rounded-2xl border-l-2 p-3.5" style={{ borderLeftColor: "var(--highlight-border)" }}>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, transparent, var(--highlight), transparent)" }}
      />
      <h2 className="mb-1.5 flex items-center gap-2 text-base font-bold text-text">
        <Sun className="h-4.5 w-4.5" style={{ color: "var(--highlight)" }} />
        Daily Verse
      </h2>

      <div className="flex-1">
        <p className="text-center font-arabic text-[1.45rem] leading-relaxed text-text" dir="rtl" lang="ar">
          {ayah.text_ar}
        </p>
        <span
          aria-hidden="true"
          className="mx-auto my-1 block h-px w-16"
          style={{ background: "linear-gradient(90deg, transparent, var(--highlight-border), transparent)" }}
        />
        {ayah.translation_en && (
          <p className="line-clamp-3 text-center text-sm text-text-secondary">{ayah.translation_en}</p>
        )}
        <p className="mt-1 text-center text-xs text-text-tertiary">
          — {surahName} ({ref.surah}:{ref.ayah})
        </p>
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => toggle(ref.surah, ref.ayah, surahName)}
            aria-label={saved ? "Remove bookmark" : "Bookmark this ayah"}
            aria-pressed={saved}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-150 ease-out hover:bg-surface-secondary hover:text-primary-hover",
              saved ? "text-primary-hover" : "text-text-tertiary"
            )}
          >
            <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            aria-label="Copy ayah text"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition-colors duration-150 ease-out hover:bg-surface-secondary hover:text-primary-hover"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label="Share this ayah"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-text-tertiary transition-colors duration-150 ease-out hover:bg-surface-secondary hover:text-primary-hover"
          >
            <Share2 className="h-4 w-4" />
          </button>
          {copied && <span className="text-[11px] text-text-tertiary">Copied</span>}
        </div>
        <Link
          href={href}
          className="btn-press inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-xs font-semibold text-white transition-colors duration-150 ease-out hover:bg-primary-hover"
        >
          Read Context
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </ContentCard>
  );
}
