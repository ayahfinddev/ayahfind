export interface SearchCandidate {
  surah: number;
  ayah: number;
  confidence: number;
  text_ar?: string | null;
  text_ar_display?: string | null;
  transliteration?: string | null;
  translation_en?: string | null;
  phonetic_score?: number | null;
  semantic_score?: number | null;
  audio_url?: string | null;
}

export interface SearchResponse {
  query: string;
  normalized_query?: string | null;
  intent_hint?: string | null;
  message?: string | null;
  results: SearchCandidate[];
  weak_matches?: SearchCandidate[];
}

export interface AyahDetail {
  surah: number;
  ayah: number;
  text_ar: string;
  text_ar_display?: string | null;
  transliteration?: string | null;
  translation_en?: string | null;
  phonetic_primary?: string | null;
  phonetic_latin?: string | null;
  audio_url?: string | null;
}

export interface ReaderResponse {
  surah: number;
  name_en: string;
  name_ar: string;
  ayahs: AyahDetail[];
}

export type SearchMode = "quran" | "hadith";

export interface TafsirEntry {
  source_slug: string;
  source_title: string;
  author: string;
  language: string;
  provider: string;
  attribution: string;
  license_note: string;
  verse_start: string;
  verse_end: string;
  text: string;
}

export interface TafsirResponse {
  verse_key: string;
  available: boolean;
  entries: TafsirEntry[];
  message?: string | null;
  /** "fixture" | "production" | null — drives the "test content" banner. */
  content_environment?: string | null;
}

export interface TafsirStatusResponse {
  enabled: boolean;
}

// --- Riwayah (Quran reading transmission) support -------------------------
// Additive only. See src/lib/riwayat.ts for the registry/colour-theme and
// backend/app/core/riwayat.py for the mirrored backend registry.

export interface ReadingVariantsResponse {
  surah: number;
  ayah: number;
  canonical_riwayah_id: string;
  equivalent_riwayah_ids: string[];
  has_reading_variants: boolean;
}
