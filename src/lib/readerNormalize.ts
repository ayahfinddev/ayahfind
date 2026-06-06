import type { AyahDetail, ReaderResponse } from "@/lib/types";

function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Normalize API / legacy JSON shapes into AyahDetail[]. */
export function normalizeAyahList(raw: unknown, surahFallback?: number): AyahDetail[] {
  if (!Array.isArray(raw)) return [];

  const out: AyahDetail[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const surah = toNum(row.surah ?? row.surah_number ?? surahFallback);
    const ayah = toNum(row.ayah ?? row.ayah_number ?? row.verse);
    const text_ar = String(row.text_ar ?? row.arabic ?? "").trim();
    if (!surah || !ayah || !text_ar) continue;
    out.push({
      surah,
      ayah,
      text_ar,
      transliteration: (row.transliteration as string) ?? null,
      translation_en: (row.translation_en as string) ?? null,
      phonetic_primary: (row.phonetic_primary as string) ?? null,
      phonetic_latin: (row.phonetic_latin as string) ?? null,
      audio_url: (row.audio_url as string) ?? null,
    });
  }

  return out.sort((a, b) => a.ayah - b.ayah);
}

export function normalizeReaderResponse(data: unknown): ReaderResponse {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const surah = toNum(d.surah);
  const rawAyahs = d.ayahs ?? d.verses ?? d.ayah_list ?? [];
  const ayahs = normalizeAyahList(rawAyahs, surah || undefined);

  return {
    surah: surah || ayahs[0]?.surah || 0,
    name_en: String(d.name_en ?? d.name ?? ""),
    name_ar: String(d.name_ar ?? ""),
    ayahs,
  };
}