"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ListTree } from "lucide-react";
import { BismillahHeader } from "@/components/quran/BismillahHeader";
import { QuranNavigator, QuranNavigatorToggle } from "@/components/quran/QuranNavigator";
import { ReaderTopBar } from "@/components/quran/ReaderTopBar";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { VerseCard } from "@/components/quran/VerseCard";
import { useAudioPlayback } from "@/contexts/AudioPlaybackContext";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useReadingMode } from "@/hooks/useReadingMode";
import { useReciter } from "@/hooks/useReciter";
import { buildSurahAudioQueue } from "@/lib/readerAudio";
import { getSurahEntry } from "@/lib/quranNavigation";
import { prepareReaderAyahs, showsBismillahHeader } from "@/lib/quranDisplay";
import { cn } from "@/lib/utils";
import type { AyahDetail } from "@/lib/types";

interface QuranReaderProps {
  surah: number;
  surahNameEn: string;
  surahNameAr?: string;
  ayahs: AyahDetail[];
  initialAyah: number;
}

export function QuranReader({
  surah,
  surahNameEn,
  surahNameAr,
  ayahs,
  initialAyah,
}: QuranReaderProps) {
  const router = useRouter();
  const { mode, setMode } = useReadingMode("verse");
  const { isSaved, toggle } = useBookmarks();
  const { reciterId } = useReciter();
  const playback = useAudioPlayback();
  const { saveProgress } = useReadingProgress();
  const [navOpen, setNavOpen] = useState(false);

  const displayAyahs = useMemo(() => prepareReaderAyahs(surah, ayahs), [surah, ayahs]);
  const audioQueue = useMemo(
    () => buildSurahAudioQueue(surah, displayAyahs, reciterId, initialAyah),
    [surah, displayAyahs, reciterId, initialAyah]
  );

  const [focusAyah, setFocusAyah] = useState(initialAyah);
  const [highlightAyah, setHighlightAyah] = useState(initialAyah);
  const scrolledRef = useRef(false);

  const focusIndex = displayAyahs.findIndex((a) => a.ayah === focusAyah);
  const queueFromFocus = useMemo(
    () => buildSurahAudioQueue(surah, displayAyahs, reciterId, focusAyah),
    [surah, displayAyahs, reciterId, focusAyah]
  );

  useEffect(() => {
    setFocusAyah(initialAyah);
    setHighlightAyah(initialAyah);
    scrolledRef.current = false;
  }, [initialAyah, surah]);

  useEffect(() => {
    if (scrolledRef.current) return;
    const el = document.getElementById(`ayah-${initialAyah}`);
    if (el) {
      scrolledRef.current = true;
      window.setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    }
  }, [initialAyah, displayAyahs.length, surah]);

  useEffect(() => {
    setHighlightAyah(initialAyah);
    const t = window.setTimeout(() => setHighlightAyah(-1), 2400);
    return () => window.clearTimeout(t);
  }, [initialAyah, surah]);

  useEffect(() => {
    if (playback.mode !== "queue" || !playback.activeAyah) return;
    if (playback.activeAyah.surah !== surah) return;
    const n = playback.activeAyah.ayah;
    setFocusAyah(n);
    setHighlightAyah(n);
    window.setTimeout(() => {
      document.getElementById(`ayah-${n}`)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
  }, [playback.activeAyah, playback.mode, surah]);

  const goAyah = useCallback(
    (nextAyah: number, nextSurah?: number) => {
      const s = nextSurah ?? surah;
      setFocusAyah(nextAyah);
      setHighlightAyah(nextAyah);
      saveProgress(s, nextAyah, getSurahEntry(s)?.en ?? surahNameEn);
      if (s !== surah) {
        router.push(`/ayah/${s}/${nextAyah}`);
        return;
      }
      router.replace(`/ayah/${s}/${nextAyah}`, { scroll: false });
      window.setTimeout(() => {
        document.getElementById(`ayah-${nextAyah}`)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 50);
    },
    [router, surah, surahNameEn, saveProgress]
  );

  useEffect(() => {
    saveProgress(surah, focusAyah, surahNameEn);
  }, [surah, focusAyah, surahNameEn, saveProgress]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      setNavOpen((o) => !o);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const startQueueFromFocus = useCallback(() => {
    const idx = queueFromFocus.findIndex((q) => q.ayah === focusAyah);
    playback.toggleQueue(queueFromFocus, idx >= 0 ? idx : 0);
  }, [playback, queueFromFocus, focusAyah]);

  const prevAyah = focusIndex > 0 ? displayAyahs[focusIndex - 1]?.ayah : null;
  const nextAyah =
    focusIndex >= 0 && focusIndex < displayAyahs.length - 1
      ? displayAyahs[focusIndex + 1]?.ayah
      : null;

  const prevSurah = surah > 1 ? surah - 1 : null;
  const nextSurah = surah < 114 ? surah + 1 : null;

  const surahNav = useMemo(
    () => (
      <div className="mb-6 flex items-center justify-between gap-2">
        {prevSurah ? (
          <Link
            href={`/ayah/${prevSurah}/1`}
            className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Surah {prevSurah}
          </Link>
        ) : (
          <span />
        )}
        {nextSurah ? (
          <Link
            href={`/ayah/${nextSurah}/1`}
            className="flex items-center gap-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900"
          >
            Surah {nextSurah}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>
    ),
    [prevSurah, nextSurah]
  );

  const [navMounted, setNavMounted] = useState(false);
  useEffect(() => setNavMounted(true), []);

  return (
    <div className={cn("reader-root relative -mt-2 min-h-[50vh]", playback.mode !== "idle" ? "pb-24" : "pb-12")}>
      <QuranNavigatorToggle open={navOpen} onClick={() => setNavOpen((o) => !o)} />
      {navMounted &&
        createPortal(
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open Quran navigator"
            data-testid="quran-nav-fab"
            className={cn(
              "fixed right-5 z-[100] flex h-12 w-12 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-lg transition-all hover:border-accent-teal/50 hover:text-teal-900 md:hidden",
              playback.mode !== "idle" ? "bottom-[calc(6.5rem+env(safe-area-inset-bottom))]" : "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
            )}
          >
            <ListTree className="h-5 w-5" />
          </button>,
          document.body
        )}
      <QuranNavigator
        open={navOpen}
        onClose={() => setNavOpen(false)}
        surah={surah}
        ayah={focusAyah}
        onNavigate={(s, a) => goAyah(a, s)}
      />
      <ReaderTopBar
        surah={surah}
        ayah={focusAyah}
        nameEn={surahNameEn}
        nameAr={surahNameAr}
        mode={mode}
        onModeChange={setMode}
        onPrevAyah={prevAyah ? () => goAyah(prevAyah) : undefined}
        onNextAyah={nextAyah ? () => goAyah(nextAyah) : undefined}
        onListenSurah={startQueueFromFocus}
        onSkipNext={playback.mode === "queue" ? playback.skipNext : undefined}
        onSkipPrev={playback.mode === "queue" ? playback.skipPrev : undefined}
        isPlaying={playback.playing && playback.mode === "queue"}
        canPrev={!!prevAyah}
        canNext={!!nextAyah}
        onOpenNavigator={() => setNavOpen(true)}
        audioActive={playback.mode !== "idle"}
      />

      <div className="reader-body pt-5 md:pt-6">
        {surahNav}
        <p className="mb-6 text-center text-sm text-neutral-500">
          {displayAyahs.length} ayahs - continuous recitation from the selected verse
        </p>

        {showsBismillahHeader(surah) && <BismillahHeader />}

        <div className="reader-verses overflow-visible rounded-2xl border border-glass-border bg-white shadow-card">
          {displayAyahs.map((a, i) => {
            const qIdx = audioQueue.findIndex((q) => q.ayah === a.ayah);
            return (
              <VerseCard
                key={a.ayah}
                surah={surah}
                ayah={a}
                mode={mode}
                active={a.ayah === focusAyah}
                highlighted={highlightAyah > 0 && a.ayah === highlightAyah}
                saved={isSaved(surah, a.ayah)}
                onToggleSave={() => toggle(surah, a.ayah, `${surahNameEn} ${a.ayah}`)}
                onSelectAyah={goAyah}
                audioQueue={audioQueue}
                audioQueueIndex={qIdx >= 0 ? qIdx : i}
                isLast={i === displayAyahs.length - 1}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}