import type { QueueItem } from "@/contexts/AudioPlaybackContext";
import type { AyahDetail } from "@/lib/types";
import { buildAyahAudioSources, type ReciterId } from "@/lib/reciters";

/** Full-surah playback queue — position is chosen at play time, not baked into the queue. */
export function buildSurahAudioQueue(
  surah: number,
  ayahs: AyahDetail[],
  reciterId: ReciterId
): QueueItem[] {
  return ayahs.map((a) => {
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

export function queueIndexForAyah(queue: QueueItem[], ayah: number): number {
  const idx = queue.findIndex((q) => q.ayah === ayah);
  return idx >= 0 ? idx : 0;
}
