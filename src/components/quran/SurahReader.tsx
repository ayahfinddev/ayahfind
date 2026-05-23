"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Volume2 } from "lucide-react";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useReciter } from "@/hooks/useReciter";
import type { AyahDetail } from "@/lib/types";
import { audioUrl, cn } from "@/lib/utils";

interface SurahReaderProps {
  surah: number;
  surahNameEn: string;
  ayahs: AyahDetail[];
  focusAyah: number;
}

function AyahBlock({
  surah,
  ayah,
  active,
}: {
  surah: number;
  ayah: AyahDetail;
  active: boolean;
}) {
  const { reciterId } = useReciter();
  const src = ayah.audio_url ?? audioUrl(surah, ayah.ayah, reciterId);
  const { playing, toggle } = useAudioPlayer(src);

  return (
    <article
      id={`ayah-${ayah.ayah}`}
      className={cn(
        "scroll-mt-24 rounded-2xl border p-5 transition-colors",
        active
          ? "border-neutral-900 bg-neutral-50 shadow-card"
          : "border-neutral-200 bg-white hover:border-neutral-300"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Ayah {ayah.ayah}
        </span>
        <button
          type="button"
          onClick={toggle}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
            playing ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700"
          )}
        >
          {playing ? <Volume2 className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          {playing ? "Stop" : "Listen"}
        </button>
      </div>
      <p className="font-arabic text-right text-2xl leading-loose text-neutral-900" dir="rtl">
        {ayah.text_ar}
      </p>
      {ayah.translation_en && (
        <p className="mt-3 text-sm leading-relaxed text-neutral-800">{ayah.translation_en}</p>
      )}
    </article>
  );
}

export function SurahReader({ surah, surahNameEn, ayahs, focusAyah }: SurahReaderProps) {
  const scrolledRef = useRef(false);

  useEffect(() => {
    if (scrolledRef.current) return;
    const el = document.getElementById(`ayah-${focusAyah}`);
    if (el) {
      scrolledRef.current = true;
      window.setTimeout(() => {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [focusAyah, ayahs.length]);

  const prevSurah = surah > 1 ? surah - 1 : null;
  const nextSurah = surah < 114 ? surah + 1 : null;

  return (
    <div className="pb-10">
      <div className="mb-4 flex items-center justify-between gap-2">
        {prevSurah ? (
          <Link
            href={`/ayah/${prevSurah}/1`}
            className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
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
            className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Surah {nextSurah}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span />
        )}
      </div>

      <p className="mb-4 text-sm text-neutral-600">
        Reading Surah {surah} · {surahNameEn} · scroll to continue through all {ayahs.length} ayahs
      </p>

      <div className="space-y-3">
        {ayahs.map((a) => (
          <AyahBlock key={a.ayah} surah={surah} ayah={a} active={a.ayah === focusAyah} />
        ))}
      </div>
    </div>
  );
}