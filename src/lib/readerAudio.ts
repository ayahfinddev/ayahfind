import type { QueueItem } from "@/contexts/AudioPlaybackContext";
import type { AyahDetail } from "@/lib/types";
import { buildAyahAudioSources, type ReciterId } from "@/lib/reciters";

export function buildSurahAudioQueue(
  surah: number,
  ayahs: AyahDetail[],
  reciterId: ReciterId,
  fromAyah: number
): QueueItem[] {
  const startIdx = Math.max(0, ayahs.findIndex((a) => a.ayah >= fromAyah));
  return ayahs.slice(startIdx).map((a) => {
    const { src, fallbackSrc } = buildAyahAudioSources(
      surah,
      a.ayah,
      reciterId,
      a.audio_url
    );
    return {
      surah,
      ayah: a.ayah,
      src,
      fallbackSrc,
    };
  });
}
