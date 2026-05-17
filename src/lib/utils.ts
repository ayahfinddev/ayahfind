import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatConfidence(score: number): string {
  return `${Math.round(score * 100)}% match`;
}

import { audioUrlForReciter, DEFAULT_RECITER_ID, type ReciterId } from "./reciters";

export function audioUrl(
  surah: number,
  ayah: number,
  reciterId: ReciterId = DEFAULT_RECITER_ID
): string {
  return audioUrlForReciter(surah, ayah, reciterId);
}
