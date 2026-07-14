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
  {
    label: "trust in Allah",
    queries: [
      "wa man yatawakkal alallahi fahuwa hasbuh",
      "whoever relies upon Allah then He is sufficient for him",
    ],
    tags: ["tawakkul", "reliance", "trust"],
    surah: 65,
    ayah: 3,
  },
  {
    label: "mercy of Allah",
    queries: [
      "la taqnatu min rahmatillah",
      "do not despair of the mercy of Allah",
      "Allah forgives all sins",
    ],
    tags: ["rahma", "forgiveness", "hope"],
    surah: 39,
    ayah: 53,
  },
  {
    label: "kindness to parents",
    queries: [
      "wa bil walidayni ihsana",
      "be good to your parents",
      "do not say a word of disrespect to your parents",
    ],
    tags: ["parents", "birr", "family"],
    surah: 17,
    ayah: 23,
  },
  {
    label: "remembrance of Allah",
    queries: [
      "ala bi dhikrillahi tatmainnul quloob",
      "hearts find rest in the remembrance of Allah",
    ],
    tags: ["dhikr", "peace", "hearts"],
    surah: 13,
    ayah: 28,
  },
  {
    label: "consultation and reliance",
    queries: [
      "fa idha azamta fatawakkal alallah",
      "when you have decided, then rely upon Allah",
    ],
    tags: ["shura", "tawakkul", "decision"],
    surah: 3,
    ayah: 159,
  },
  {
    label: "marriage and tranquility",
    queries: [
      "wa min ayatihi an khalaqa lakum azwaja",
      "He created for you spouses that you may find tranquility",
    ],
    tags: ["marriage", "sakinah", "family"],
    surah: 30,
    ayah: 21,
  },
  {
    label: "humanity and nations",
    queries: [
      "ya ayyuhannasu inna khalaqnakum",
      "We created you from a male and female and made you nations and tribes",
    ],
    tags: ["unity", "diversity", "mankind"],
    surah: 49,
    ayah: 13,
  },
  {
    label: "prayer and immorality",
    queries: [
      "innas salata tanha anil fahshai wal munkar",
      "prayer prohibits immorality and wrongdoing",
    ],
    tags: ["salah", "prayer", "protection"],
    surah: 29,
    ayah: 45,
  },
  {
    label: "the light verse",
    queries: ["allahu nurus samawati wal ard", "Allah is the light of the heavens and the earth"],
    tags: ["nur", "light", "reflection"],
    surah: 24,
    ayah: 35,
  },
  {
    label: "ease after hardship",
    queries: ["rabbish rahli sadri", "my Lord, expand for me my breast and ease my task"],
    tags: ["ease", "dua", "trials"],
    surah: 20,
    ayah: 25,
  },
  {
    label: "which favor will you deny",
    queries: [
      "fabiayyi alai rabbikuma tukazziban",
      "which of the favors of your Lord will you deny",
    ],
    tags: ["blessings", "reflection", "creation"],
    surah: 55,
    ayah: 13,
  },
  {
    label: "truth and patience",
    queries: [
      "wa tawasaw bil haqqi wa tawasaw bis sabr",
      "enjoin truth and enjoin patience upon one another",
    ],
    tags: ["truth", "sabr", "community"],
    surah: 103,
    ayah: 3,
  },
  {
    label: "satisfaction with Allah's plan",
    queries: [
      "wa lasawfa yutika rabbuka fatarda",
      "your Lord is going to give you, and you will be satisfied",
    ],
    tags: ["contentment", "hope", "trials"],
    surah: 93,
    ayah: 5,
  },
  {
    label: "the unseen and knowledge",
    queries: ["wa indahu mafatihul ghayb", "with Him are the keys of the unseen"],
    tags: ["ghayb", "knowledge", "reflection"],
    surah: 6,
    ayah: 59,
  },
];

export function findTopicByLabel(label: string): SearchTopic | undefined {
  return SEARCH_TOPICS.find((t) => t.label === label);
}