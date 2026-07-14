/** Curated verse references for the homepage's Daily Reflection card.
 * Only refs are stored here — actual Arabic/translation text is fetched via
 * `fetchReader()` so the reader stays the single source of truth. */
export interface ReflectionRef {
  surah: number;
  ayah: number;
}

export const DAILY_REFLECTIONS: ReflectionRef[] = [
  { surah: 2, ayah: 153 }, // patience and prayer
  { surah: 2, ayah: 286 }, // Allah does not burden a soul beyond its capacity
  { surah: 3, ayah: 159 }, // consult and rely on Allah
  { surah: 6, ayah: 59 }, // the keys of the unseen
  { surah: 13, ayah: 28 }, // hearts find rest in remembrance of Allah
  { surah: 14, ayah: 7 }, // if you are grateful, I will increase you
  { surah: 16, ayah: 128 }, // Allah is with those who are righteous
  { surah: 17, ayah: 23 }, // kindness to parents
  { surah: 17, ayah: 32 }, // do not approach unlawful intercourse
  { surah: 20, ayah: 25 }, // Moses' prayer for ease
  { surah: 24, ayah: 35 }, // the light verse
  { surah: 29, ayah: 45 }, // prayer prevents immorality
  { surah: 30, ayah: 21 }, // spouses as a sign of tranquility
  { surah: 39, ayah: 53 }, // do not despair of Allah's mercy
  { surah: 49, ayah: 13 }, // mankind created from male and female, into nations
  { surah: 55, ayah: 13 }, // which of your Lord's favors will you deny
  { surah: 65, ayah: 3 }, // whoever relies on Allah, He is sufficient
  { surah: 93, ayah: 5 }, // your Lord will give you, and you will be satisfied
  { surah: 94, ayah: 5 }, // with hardship comes ease
  { surah: 103, ayah: 3 }, // enjoin truth and patience
];

function dayOfYear(date: Date): number {
  // UTC-based on purpose: a local-time ms-diff can land on a non-24h day
  // across a DST transition, silently shifting which entry gets picked.
  const start = Date.UTC(date.getFullYear(), 0, 1);
  const current = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((current - start) / 86_400_000) + 1;
}

/** Deterministic per-day pick — stable across reloads within the same day, no storage needed. */
export function getTodaysReflection(date: Date = new Date()): ReflectionRef {
  const index = dayOfYear(date) % DAILY_REFLECTIONS.length;
  return DAILY_REFLECTIONS[index];
}
