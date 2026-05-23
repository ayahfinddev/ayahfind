import type { QueueItem } from "@/contexts/AudioPlaybackContext";
import type { AyahDetail } from "@/lib/types";
import { audioUrl } from "@/lib/utils";
import type { ReciterId } from "@/lib/reciters";

export function buildSurahAudioQueue(
  surah: number,
  ayahs: AyahDetail[],
  reciterId: ReciterId,
  fromAyah: number
): QueueItem[] {
  const startIdx = Math.max(0, ayahs.findIndex((a) => a.ayah >= fromAyah));
  return ayahs.slice(startIdx).map((a) => ({
    surah,
    ayah: a.ayah,
    src: a.audio_url ?? audioUrl(surah, a.ayah, reciterId),
  }));
}