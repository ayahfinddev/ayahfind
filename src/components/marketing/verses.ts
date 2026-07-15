/** Real Qur'anic text used by the marketing homepage.
 *
 * Every Arabic string and English translation here is copied verbatim from
 * `data/processed/ayahs_processed.json` (the same corpus the search backend
 * serves) — never invented or paraphrased. The landing page must not make
 * live backend requests on scroll, so the handful of verses its scenes
 * resolve to are embedded statically.
 */

export interface MarketingVerse {
  surah: number;
  ayah: number;
  surahName: string;
  textAr: string;
  translationEn: string;
}

/** An-Naml 27:88 — the hero demo result ("the mountains move like clouds"). */
export const VERSE_27_88: MarketingVerse = {
  surah: 27,
  ayah: 88,
  surahName: "An-Naml",
  textAr:
    "وَتَرَى ٱلْجِبَالَ تَحْسَبُهَا جَامِدَةًۭ وَهِىَ تَمُرُّ مَرَّ ٱلسَّحَابِ ۚ صُنْعَ ٱللَّهِ ٱلَّذِىٓ أَتْقَنَ كُلَّ شَىْءٍ ۚ إِنَّهُۥ خَبِيرٌۢ بِمَا تَفْعَلُونَ",
  translationEn:
    "And you see the mountains, thinking them rigid, while they will pass as the passing of clouds. [It is] the work of Allah, who perfected all things. Indeed, He is Acquainted with that which you do.",
};

/** Az-Zumar 39:53 — "do not despair of Allah's mercy". */
export const VERSE_39_53: MarketingVerse = {
  surah: 39,
  ayah: 53,
  surahName: "Az-Zumar",
  textAr:
    "۞ قُلْ يَٰعِبَادِىَ ٱلَّذِينَ أَسْرَفُوا۟ عَلَىٰٓ أَنفُسِهِمْ لَا تَقْنَطُوا۟ مِن رَّحْمَةِ ٱللَّهِ ۚ إِنَّ ٱللَّهَ يَغْفِرُ ٱلذُّنُوبَ جَمِيعًا ۚ إِنَّهُۥ هُوَ ٱلْغَفُورُ ٱلرَّحِيمُ",
  translationEn:
    'Say, "O My servants who have transgressed against themselves [by sinning], do not despair of the mercy of Allah. Indeed, Allah forgives all sins. Indeed, it is He who is the Forgiving, the Merciful."',
};

/** Ar-Rahman 55:19 — "the two seas". */
export const VERSE_55_19: MarketingVerse = {
  surah: 55,
  ayah: 19,
  surahName: "Ar-Rahman",
  textAr: "مَرَجَ ٱلْبَحْرَيْنِ يَلْتَقِيَانِ",
  translationEn: "He released the two seas, meeting [side by side];",
};

/** Ar-Rahman 55:20 — the barrier between the two seas. */
export const VERSE_55_20: MarketingVerse = {
  surah: 55,
  ayah: 20,
  surahName: "Ar-Rahman",
  textAr: "بَيْنَهُمَا بَرْزَخٌۭ لَّا يَبْغِيَانِ",
  translationEn: "Between them is a barrier [so] neither of them transgresses.",
};

/** Scene 5 — different ways a person half-remembers a verse, each paired
 * with the real verse it resolves to. */
export interface ExampleQuery {
  query: string;
  kind: "meaning" | "english" | "arabic" | "transliteration";
  kindLabel: string;
  verse: MarketingVerse;
  dir?: "rtl";
}

export const EXAMPLE_QUERIES: ExampleQuery[] = [
  {
    query: "do not despair of Allah's mercy",
    kind: "english",
    kindLabel: "English wording",
    verse: VERSE_39_53,
  },
  {
    query: "two seas that do not mix",
    kind: "meaning",
    kindLabel: "Meaning only",
    verse: VERSE_55_20,
  },
  {
    query: "مرج البحرين",
    kind: "arabic",
    kindLabel: "Arabic fragment",
    verse: VERSE_55_19,
    dir: "rtl",
  },
  {
    query: "la taqnatu min rahmatillah",
    kind: "transliteration",
    kindLabel: "How it sounds",
    verse: VERSE_39_53,
  },
];

/** Ayah count per surah (1..114) — used by the scale scene to draw all
 * 6,236 ayat as a structured field. */
export { SURAH_CATALOG } from "@/lib/quranNavigation";
