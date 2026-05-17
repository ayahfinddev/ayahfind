/** Curated quick topics — proven search queries and canonical verse anchors. */
export type QuickTopic = {
  label: string;
  searchQuery: string;
  surah: number;
  ayah: number;
};

export const QUICK_TOPICS: QuickTopic[] = [
  {
    label: "hardship and ease",
    searchQuery: "fa inama al usri yusra",
    surah: 94,
    ayah: 5,
  },
  {
    label: "not burden a soul",
    searchQuery: "la yukallifullahu nafsan illa wusaha",
    surah: 2,
    ayah: 286,
  },
  {
    label: "do not approach zina",
    searchQuery: "wa la taqrabu zina",
    surah: 17,
    ayah: 32,
  },
  {
    label: "patience",
    searchQuery: "inna allaha maas sabireen",
    surah: 2,
    ayah: 153,
  },
  {
    label: "gratitude",
    searchQuery: "la in shakartum laazidannakum",
    surah: 14,
    ayah: 7,
  },
];