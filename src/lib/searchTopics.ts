/** Curated themes with fallback queries and canonical verses. */
export type SearchTopic = {
  label: string;
  queries: string[];
  tags?: string[];
  surah: number;
  ayah: number;
};

export const SEARCH_TOPICS: SearchTopic[] = [
  {
    label: "hardship and ease",
    queries: [
      "fa inama al usri yusra",
      "with hardship comes ease",
      "after hardship comes ease",
    ],
    tags: ["ash-sharh", "relief", "trials"],
    surah: 94,
    ayah: 5,
  },
  {
    label: "not burden a soul",
    queries: [
      "la yukallifullahu nafsan illa wusaha",
      "Allah does not burden a soul beyond that it can bear",
    ],
    tags: ["burden", "capacity", "mercy"],
    surah: 2,
    ayah: 286,
  },
  {
    label: "do not approach zina",
    queries: ["wa la taqrabu zina", "do not approach unlawful sexual intercourse"],
    tags: ["chastity", "fornication"],
    surah: 17,
    ayah: 32,
  },
  {
    label: "patience",
    queries: [
      "inna allaha maas sabireen",
      "Allah is with the patient",
      "those who are patient",
      "perseverance in trials",
    ],
    tags: ["sabr", "steadfastness", "trials"],
    surah: 2,
    ayah: 153,
  },
  {
    label: "gratitude",
    queries: [
      "la in shakartum laazidannakum",
      "if you are grateful I will surely increase you",
      "be grateful to Allah",
      "thankful for blessings",
    ],
    tags: ["shukr", "thankful", "blessings"],
    surah: 14,
    ayah: 7,
  },
];

export function findTopicByLabel(label: string): SearchTopic | undefined {
  return SEARCH_TOPICS.find((t) => t.label === label);
}