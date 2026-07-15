import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchExperience } from "@/components/home/SearchExperience";

export const metadata: Metadata = {
  title: "Search the Qur'an — AyahFind",
  description:
    "Find any ayah from what you remember — meaning, English wording, Arabic text or an imperfect phrase. Semantic, lexical and phonetic Qur'an search with reader, audio and tafsir.",
  alternates: { canonical: "/search" },
  openGraph: {
    title: "Search the Qur'an — AyahFind",
    description:
      "Find any ayah from what you remember — meaning, English wording, Arabic text or an imperfect phrase.",
    url: "/search",
    siteName: "AyahFind",
    type: "website",
  },
};

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchExperience />
    </Suspense>
  );
}
