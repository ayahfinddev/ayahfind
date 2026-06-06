"use client";

import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { useReciter } from "@/hooks/useReciter";
import { getJuzForRef } from "@/lib/quranNavigation";

export function ContinueReadingCard() {
  const { progress } = useReadingProgress();
  const { reciter } = useReciter();

  if (!progress) return null;

  const juz = getJuzForRef(progress.surah, progress.ayah);
  const href = `/ayah/${progress.surah}/${progress.ayah}`;

  return (
    <Link
      href={href}
      className="group mb-6 flex items-center gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-surface text-accent-dim ring-1 ring-accent-border/50">
        <BookOpen className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-widest text-accent-dim">
          Continue reading
        </span>
        <span className="block truncate text-sm font-semibold text-ink">
          {progress.nameEn} · {progress.surah}:{progress.ayah}
        </span>
        <span className="text-xs text-ink-subtle">
          Juz {juz} · {reciter.name}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
