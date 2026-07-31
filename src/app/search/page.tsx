import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchLanding } from "@/components/search/SearchLanding";

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

/** Shared `/search?q=...` links (and the `/?q=` middleware redirect that
 * feeds them) still land here and run the query on mount — useAyahSearch
 * reads the param, exactly as the dashboard used to. */
export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchLanding />
    </Suspense>
  );
}
