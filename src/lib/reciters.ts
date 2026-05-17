export type ReciterId = "alafasy" | "yasser-dossari";

export interface Reciter {
  id: ReciterId;
  name: string;
  everyAyahFolder: string;
}

export const RECITERS: Reciter[] = [
  {
    id: "alafasy",
    name: "Mishary Alafasy",
    everyAyahFolder: "Alafasy_128kbps",
  },
  {
    id: "yasser-dossari",
    name: "Yasser Al-Dossari",
    everyAyahFolder: "Yasser_Ad-Dussary_128kbps",
  },
];

export const DEFAULT_RECITER_ID: ReciterId = "alafasy";

export const RECITER_STORAGE_KEY = "ayahfind_reciter";

export function getReciterById(id: ReciterId): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

export function audioUrlForReciter(
  surah: number,
  ayah: number,
  reciterId: ReciterId = DEFAULT_RECITER_ID
): string {
  const reciter = getReciterById(reciterId);
  const file = `${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
  return `https://everyayah.com/data/${reciter.everyAyahFolder}/${file}`;
}