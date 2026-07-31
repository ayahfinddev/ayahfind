import { Suspense } from "react";
import type { Metadata } from "next";
import { SearchExperience } from "@/components/home/SearchExperience";

/** The signed-out app dashboard — Continue Reading, Quick Actions, recent
 * searches and Discover. Previously served at /search; that route now holds
 * the dedicated search page, and `/home` is what the sidebar's "Home" points
 * at. Not indexed: everything on it is personal, client-only state, so the
 * crawlable entry points are `/` (marketing) and `/search`. */
export const metadata: Metadata = {
  title: "Home — AyahFind",
  description:
    "Pick up where you left off, revisit saved ayat and recent searches, and explore the Qur'an.",
  robots: { index: false, follow: true },
};

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <SearchExperience />
    </Suspense>
  );
}
