export interface SearchCandidate {
  surah: number;
  ayah: number;
  confidence: number;
  text_ar?: string | null;
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
