"use client";

import Link from "next/link";
import { BookMarked } from "lucide-react";
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
      className="mb-5 flex items-center gap-3 rounded-2xl border border-accent-border bg-accent-surface px-4 py-3.5 transition-colors hover:border-accent/40 hover:bg-accent-surface"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-canvas text-accent-dim shadow-sm">
        <BookMarked className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-accent-dim">
          Continue reading
        </span>
        <span className="block truncate text-sm font-semibold text-ink">
          {progress.nameEn} · {progress.surah}:{progress.ayah}
        </span>
        <span className="text-xs text-ink-muted">
          Juz {juz} · {reciter.name}
        </span>
      </span>
      <span className="shrink-0 text-xs font-medium text-accent-dim">Resume</span>
    </Link>
  );
}
