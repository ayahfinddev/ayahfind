"use client";

import { Bookmark, Copy, Pause, Play, Share2 } from "lucide-react";
import { useAudioPlayback, type QueueItem } from "@/contexts/AudioPlaybackContext";
import type { ReadingMode } from "@/hooks/useReadingMode";
import type { AyahDetail } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AnnotatedArabicText } from "@/components/quran/AnnotatedArabicText";
import { TafsirPanel } from "@/components/quran/TafsirPanel";
import { ReaderSection } from "@/components/ui/ReaderSection";
import { ActionBar } from "@/components/ui/ActionBar";

interface VerseCardProps {
  surah: number;
  ayah: AyahDetail;
  mode: ReadingMode;
  active: boolean;
  highlighted: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onSelectAyah: (ayah: number) => void;
  audioQueue: QueueItem[];
  audioQueueIndex: number;
  isLast?: boolean;
}

export function VerseCard(props: VerseCardProps) {
  const { surah, ayah, mode, active, highlighted, saved, onToggleSave, onSelectAyah, audioQueue, audioQueueIndex } = props;

  const playback = useAudioPlayback();
  const playing = playback.isActiveVerse(surah, ayah.ayah);
  const showArabic      = mode === "verse" || mode === "both" || mode === "arabic";
  const showTranslation = mode === "verse" || mode === "both" || mode === "translation";

  const toggleListen = () => playback.toggleQueue(audioQueue, audioQueueIndex);

  const copyVerse = async () => {
    const text = [ayah.text_ar, ayah.translation_en, `Surah ${surah}:${ayah.ayah}`]
      .filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  const shareVerse = async () => {
    const url = `${window.location.origin}/ayah/${surah}/${ayah.ayah}`;
    try {
      if (navigator.share) await navigator.share({ title: `Quran ${surah}:${ayah.ayah}`, url });
      else await navigator.clipboard.writeText(url);
    } catch { /* ignore */ }
  };

  return (
    <ReaderSection
      id={`ayah-${ayah.ayah}`}
      active={active}
      className={cn("reader-verse group scroll-mt-28", highlighted && "reader-highlight", !active && "hover:bg-surface-secondary/60")}
      label={
        <button
          type="button"
          onClick={() => onSelectAyah(ayah.ayah)}
          className="text-xs font-normal tracking-wide text-text-tertiary transition-colors hover:text-primary-hover"
        >
          {surah}:{ayah.ayah}
        </button>
      }
      actions={
        <div className="flex items-center opacity-70 transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-within:opacity-100">
          <ActionBar
            items={[
              {
                key: "listen",
                icon: playing ? <Pause /> : <Play />,
                label: playing ? "Pause" : "Play",
                onClick: toggleListen,
                active: playing,
              },
              {
                key: "bookmark",
                icon: <Bookmark className={cn(saved && "fill-current")} />,
                label: "Bookmark",
                onClick: onToggleSave,
                active: saved,
              },
              { key: "copy", icon: <Copy />, label: "Copy", onClick: copyVerse },
              { key: "share", icon: <Share2 />, label: "Share", onClick: shareVerse },
            ]}
          />
        </div>
      }
    >
      {/* Arabic — always the visually dominant element on this card */}
      {showArabic && (
        <p
          className={cn(
            "reader-verse-arabic font-arabic break-words text-text",
            mode === "arabic"
              ? "mt-2 text-center text-arabic-lg"
              : "mt-3 text-right text-arabic-md"
          )}
          dir="rtl"
          lang="ar"
        >
          <AnnotatedArabicText text={ayah.text_ar} />
        </p>
      )}

      {/* Translation — secondary to Arabic */}
      {showTranslation && ayah.translation_en && (
        <p
          className={cn(
            "reader-verse-translation break-words text-text-secondary",
            mode === "verse" || mode === "both" ? "mt-5 text-body-sm" : "mt-4 text-body"
          )}
        >
          {ayah.translation_en}
        </p>
      )}

      <div className="mt-4">
        <TafsirPanel surah={surah} ayah={ayah.ayah} />
      </div>
    </ReaderSection>
  );
}
