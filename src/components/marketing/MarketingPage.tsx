"use client";

import dynamic from "next/dynamic";
import { MarketingNavbar } from "./MarketingNavbar";
import { HeroProblemScene } from "./scenes/HeroProblemScene";
import { SearchResolutionScene } from "./scenes/SearchResolutionScene";
import { FinalCTA } from "./scenes/FinalCTA";
import { MARKETING_THEME_VARS } from "./marketingTheme";
import "./marketing.css";

// Below-the-fold scenes load lazily — a visitor who never scrolls past the
// hero never downloads them. ssr:false is deliberate: they are pure
// scroll-choreography with no SEO-critical copy beyond their headings,
// which are short and duplicated in the page metadata description.
const SearchEnginesScene = dynamic(
  () => import("./scenes/SearchEnginesScene").then((m) => m.SearchEnginesScene),
  { ssr: false }
);
const ProductExpansionScene = dynamic(
  () => import("./scenes/ProductExpansionScene").then((m) => m.ProductExpansionScene),
  { ssr: false }
);
const QueryExamplesScene = dynamic(
  () => import("./scenes/QueryExamplesScene").then((m) => m.QueryExamplesScene),
  { ssr: false }
);
const QuranScaleScene = dynamic(
  () => import("./scenes/QuranScaleScene").then((m) => m.QuranScaleScene),
  { ssr: false }
);

/** The cinematic marketing homepage at `/`.
 *
 * Renders chrome-free (AppShell bypasses the sidebar/bottom-nav for this
 * route) inside a fixed Forest Night palette (see marketingTheme.ts) so the
 * page looks identical regardless of the visitor's in-app theme. All scene
 * choreography is scroll-scrubbed with framer-motion and reversible; every
 * scene has a static reduced-motion variant. */
export function MarketingPage() {
  return (
    <div
      style={MARKETING_THEME_VARS}
      className="min-h-screen bg-background text-text antialiased"
    >
      <MarketingNavbar />
      <main>
        <HeroProblemScene />
        <SearchResolutionScene />
        <SearchEnginesScene />
        <ProductExpansionScene />
        <QueryExamplesScene />
        <QuranScaleScene />
        <FinalCTA />
      </main>
    </div>
  );
}
