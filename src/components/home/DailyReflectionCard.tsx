"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sunrise, Bookmark, Copy, Share2, ArrowRight } from "lucide-react";
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

  if (!ayah) {
    return <SkeletonCard />;
  }

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
    <ContentCard
      elevation="surface"
      padding="sm"
      className="relative flex min-h-[160px] flex-col overflow-hidden rounded-[20px] p-3.5"
      style={{
        background: "linear-gradient(160deg, rgba(212,175,55,0.08), transparent 55%), var(--surface)",
      }}
    >
      {/* Decorative corner flourish — a quiet "opened page" feel */}
      <svg viewBox="0 0 40 40" aria-hidden="true" className="absolute right-3 top-3 h-9 w-9 opacity-[0.16] text-gold">
        <path d="M2 20a18 18 0 0118-18M8 20a12 12 0 0112-12M14 20a6 6 0 016-6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-text-tertiary">
        <Sunrise className="h-4 w-4 text-gold" />
        Daily reflection
      </div>

      <div className="relative mt-2 flex-1">
        <p className="text-right font-arabic text-xl leading-relaxed text-text" dir="rtl" lang="ar">
          {ayah.text_ar}
          <span className="mx-1 inline-block text-sm align-middle text-gold">۝</span>
        </p>
        {ayah.translation_en && (
          <p className="mt-1.5 font-serif text-[15px] italic leading-snug text-text-secondary">
            &ldquo;{ayah.translation_en}&rdquo;
          </p>
        )}
      </div>

      <div className="relative mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => toggle(ref.surah, ref.ayah, surahName)}
            aria-label={saved ? "Remove bookmark" : "Bookmark this ayah"}
            aria-pressed={saved}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150 ease-out hover:bg-accent-surface hover:text-primary-hover",
              saved ? "text-primary-hover" : "text-text-tertiary"
            )}
          >
            <Bookmark className="h-4 w-4" fill={saved ? "currentColor" : "none"} />
          </button>
          <button
            type="button"
            onClick={() => void handleCopy()}
            aria-label="Copy ayah text"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors duration-150 ease-out hover:bg-accent-surface hover:text-primary-hover"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label="Share this ayah"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary transition-colors duration-150 ease-out hover:bg-accent-surface hover:text-primary-hover"
          >
            <Share2 className="h-4 w-4" />
          </button>
          {copied && <span className="text-[11px] text-text-tertiary">Copied</span>}
        </div>
        <Link
          href={href}
          className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-xs font-semibold text-white transition-colors duration-150 ease-out hover:bg-primary-hover"
        >
          Read Context
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </ContentCard>
  );
}
