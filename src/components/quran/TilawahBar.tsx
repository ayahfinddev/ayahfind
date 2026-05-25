"use client";

import { useEffect, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, X } from "lucide-react";
import { useAudioPlayback } from "@/contexts/AudioPlaybackContext";
import { ReaderReciterSelect } from "@/components/quran/ReaderReciterSelect";
import { getSurahEntry } from "@/lib/quranNavigation";
import { cn } from "@/lib/utils";
import { TilawahProgress } from "./TilawahProgress";

export function TilawahBar() {
  const playback = useAudioPlayback();
  const { mode, playing, activeAyah, pause, resume, stop, skipNext, skipPrev } =
    playback;

  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  const active = mode !== "idle";

  useEffect(() => {
    if (active) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(t);
  }, [active]);

  if (!mounted) return null;

  const surahEntry = activeAyah ? getSurahEntry(activeAyah.surah) : null;
  const ayahLabel = activeAyah
    ? `${activeAyah.surah}:${activeAyah.ayah}`
    : "";
  const surahName = surahEntry?.en ?? "";
  const isQueue = mode === "queue";

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-50 transition-transform duration-200 ease-out",
        "bottom-[calc(3.25rem+env(safe-area-inset-bottom))] md:bottom-0",
        visible ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="relative border-t border-neutral-200/80 bg-white/95 backdrop-blur-md md:pb-safe">
        <TilawahProgress />

        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2.5 lg:max-w-5xl">
          {/* Ayah reference */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-neutral-800">
              {surahName}
            </p>
            <p className="truncate text-[11px] text-neutral-500">
              Ayah {ayahLabel}
            </p>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-1">
            {isQueue && (
              <button
                type="button"
                onClick={skipPrev}
                className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 active:bg-neutral-200"
                aria-label="Previous ayah"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={playing ? pause : resume}
              className="rounded-full bg-neutral-900 p-2 text-white transition-colors hover:bg-neutral-800 active:bg-neutral-700"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5 translate-x-[1px]" />
              )}
            </button>

            {isQueue && (
              <button
                type="button"
                onClick={skipNext}
                className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 active:bg-neutral-200"
                aria-label="Next ayah"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Reciter + Close */}
          <div className="flex flex-1 items-center justify-end gap-1.5">
            <ReaderReciterSelect dropdownDirection="up" />
            <button
              type="button"
              onClick={stop}
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Stop recitation"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}