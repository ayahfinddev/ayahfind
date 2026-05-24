export type ReciterId =
  | "alafasy"
  | "yasser-dossari"
  | "muhammad-ayyub"
  | "saleh-al-luhaidan"
  | "abdullah-kamel"
  | "hani-ar-rifai"
  | "abdullah-al-juhany";

export type ReciterAvailability = "verified" | "unverified" | "unavailable";

export interface Reciter {
  id: ReciterId;
  name: string;
  everyAyahFolder: string;
  bitrate: string;
  sortOrder: number;
  /** Only enabled reciters appear in Settings and are used for playback. */
  enabled: boolean;
  availability: ReciterAvailability;
  /** Admin note — why disabled or verification details. */
  coverageNote?: string;
}

/** Central registry — add reciters here; run `node scripts/verify-reciter-coverage.mjs` before enabling. */
export const RECITER_REGISTRY: Reciter[] = [
  {
    id: "alafasy",
    name: "Mishary Alafasy",
    everyAyahFolder: "Alafasy_128kbps",
    bitrate: "128kbps",
    sortOrder: 10,
    enabled: true,
    availability: "verified",
    coverageNote: "EveryAyah verse-by-verse, full Quran",
  },
  {
    id: "yasser-dossari",
    name: "Yasser Al-Dossari",
    everyAyahFolder: "Yasser_Ad-Dussary_128kbps",
    bitrate: "128kbps",
    sortOrder: 20,
    enabled: true,
    availability: "verified",
    coverageNote: "EveryAyah verse-by-verse, full Quran",
  },
  {
    id: "muhammad-ayyub",
    name: "Muhammad Ayyub",
    everyAyahFolder: "Muhammad_Ayyoub_128kbps",
    bitrate: "128kbps",
    sortOrder: 30,
    enabled: true,
    availability: "verified",
    coverageNote: "EveryAyah verse-by-verse; spot-checked 37 ayahs across all juz",
  },
  {
    id: "hani-ar-rifai",
    name: "Hani Ar-Rifai",
    everyAyahFolder: "Hani_Rifai_192kbps",
    bitrate: "192kbps",
    sortOrder: 40,
    enabled: true,
    availability: "verified",
    coverageNote: "EveryAyah verse-by-verse (192kbps); spot-checked 37 ayahs across all juz",
  },
  {
    id: "abdullah-al-juhany",
    name: "Abdullah Al-Juhany",
    everyAyahFolder: "Abdullaah_3awwaad_Al-Juhaynee_128kbps",
    bitrate: "128kbps",
    sortOrder: 50,
    enabled: true,
    availability: "verified",
    coverageNote: "EveryAyah folder Abdullaah_3awwaad_Al-Juhaynee_128kbps; spot-checked 37 ayahs",
  },
  {
    id: "saleh-al-luhaidan",
    name: "Saleh Al Luhaidan",
    everyAyahFolder: "",
    bitrate: "128kbps",
    sortOrder: 60,
    enabled: false,
    availability: "unavailable",
    coverageNote: "No verse-by-verse folder on everyayah.com — keep disabled until a verified CDN path exists",
  },
  {
    id: "abdullah-kamel",
    name: "Abdullah Kamel",
    everyAyahFolder: "",
    bitrate: "128kbps",
    sortOrder: 70,
    enabled: false,
    availability: "unavailable",
    coverageNote: "Surah-level audio exists elsewhere but not EveryAyah per-ayah — keep disabled until verified",
  },
];

/** @deprecated Use RECITER_REGISTRY */
export const RECITERS = RECITER_REGISTRY;

export const ENABLED_RECITERS = RECITER_REGISTRY.filter((r) => r.enabled).sort(
  (a, b) => a.sortOrder - b.sortOrder
);

export const DEFAULT_RECITER_ID: ReciterId = "alafasy";

export const RECITER_STORAGE_KEY = "ayahfind_reciter";

const AUDIO_DEBUG =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_AUDIO_DEBUG === "1";

export interface AyahAudioSources {
  src: string;
  fallbackSrc?: string;
}

export function isReciterId(value: string): value is ReciterId {
  return RECITER_REGISTRY.some((r) => r.id === value);
}

export function isEnabledReciterId(value: string): value is ReciterId {
  return ENABLED_RECITERS.some((r) => r.id === value);
}

export function getReciterById(id: ReciterId): Reciter {
  return RECITER_REGISTRY.find((r) => r.id === id) ?? RECITER_REGISTRY[0];
}

export function getEnabledReciterById(id: ReciterId): Reciter {
  const reciter = getReciterById(id);
  return reciter.enabled ? reciter : getReciterById(DEFAULT_RECITER_ID);
}

export function readStoredReciterId(): ReciterId {
  if (typeof window === "undefined") return DEFAULT_RECITER_ID;
  try {
    const stored = localStorage.getItem(RECITER_STORAGE_KEY);
    if (stored && isEnabledReciterId(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_RECITER_ID;
}

export function audioUrlForReciter(
  surah: number,
  ayah: number,
  reciterId: ReciterId = DEFAULT_RECITER_ID
): string {
  const reciter = getEnabledReciterById(reciterId);
  const file = `${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
  return `https://everyayah.com/data/${reciter.everyAyahFolder}/${file}`;
}

/**
 * Builds primary + fallback URLs for an ayah. Always uses the selected reciter for
 * primary (never the API's Mishary-only audio_url).
 */
export function buildAyahAudioSources(
  surah: number,
  ayah: number,
  reciterId: ReciterId,
  apiAudioUrl?: string | null
): AyahAudioSources {
  const src = audioUrlForReciter(surah, ayah, reciterId);
  const fallbackSrc =
    reciterId !== DEFAULT_RECITER_ID
      ? audioUrlForReciter(surah, ayah, DEFAULT_RECITER_ID)
      : undefined;

  if (AUDIO_DEBUG) {
    console.debug("[AyahFind audio]", {
      reciterId,
      surah,
      ayah,
      src,
      fallbackSrc: fallbackSrc ?? null,
      ignoredApiAudioUrl: apiAudioUrl ?? null,
    });
  }

  return { src, fallbackSrc };
}

/** @deprecated Prefer buildAyahAudioSources for playback (includes fallback). */
export function resolveAyahAudioUrl(
  surah: number,
  ayah: number,
  reciterId: ReciterId,
  apiAudioUrl?: string | null
): string {
  return buildAyahAudioSources(surah, ayah, reciterId, apiAudioUrl).src;
}
