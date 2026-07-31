"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ContinueReadingCard } from "@/components/home/ContinueReadingCard";
import { QuickActions } from "@/components/home/QuickActions";
import { RecentSearchesCard } from "@/components/home/RecentSearchesCard";
import { BookmarkedAyahsCard } from "@/components/home/BookmarkedAyahsCard";
import { DailyReflectionCard } from "@/components/home/DailyReflectionCard";
import { DiscoverMoreSection } from "@/components/home/DiscoverMoreSection";
import { IslamicPatternBg } from "@/components/home/IslamicPatternBg";
import { AISearchBar } from "@/components/search/AISearchBar";
import { VoiceSearchModal } from "@/components/search/VoiceSearchModal";
import { SemanticChips } from "@/components/search/SemanticChips";
import { SearchResultsPanel } from "@/components/results/SearchResultsPanel";
import { useAyahSearch } from "@/hooks/useAyahSearch";
import { getGreeting } from "@/lib/utils";
import { useSearchHome } from "@/contexts/SearchHomeContext";

export function SearchExperience() {
  const {
    query,
    setQuery,
    mode,
    setMode,
    results,
    weakMatches,
    noMatchMessage,
    loading,
    error,
    aiHint,
    activeTopic,
    executeSearch,
    runTopic,
    reset,
  } = useAyahSearch();

  const [voiceOpen, setVoiceOpen] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const { registerReset } = useSearchHome();

  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  // Results render below the whole dashboard, so without this a search
  // (or reopening a past query) would show nothing on screen unless the
  // user scrolled down manually. Scroll as soon as loading starts — that's
  // the earliest point the skeleton is on-screen — rather than waiting for
  // the response.
  useEffect(() => {
    if (loading) {
      // "instant" (not "smooth") deliberately — this page sets a global
      // `scroll-behavior: smooth`, which has caused this exact scrollIntoView
      // call to silently no-op in testing. Forcing instant sidesteps that.
      resultsRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }, [loading]);

  const resetToLanding = useCallback(() => {
    reset();
    setVoiceOpen(false);
  }, [reset]);

  useEffect(() => {
    registerReset(resetToLanding);
    return () => registerReset(null);
  }, [registerReset, resetToLanding]);

  const onVoiceSearch = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q) return;
      setVoiceOpen(false);
      void executeSearch(q);
    },
    [executeSearch]
  );

  return (
    <>
      <div className="space-y-2.5">
        {/* Hero: greeting + search. The decorative Mushaf-on-a-rehal
         * illustration and the notifications bell that used to sit in this
         * top-right area are gone — nothing generates notifications while
         * there's no account system, and the hero reads calmer without the
         * illustration competing with the search bar. */}
        <div className="relative overflow-hidden rounded-2xl">
          {/* Extremely faint girih lattice + warm gold glow — felt, not noticed */}
          <IslamicPatternBg
            className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-[0.02]"
            color="var(--primary)"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-16 -z-10 h-72 w-72 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--highlight), transparent 70%)" }}
          />

          <div className="relative z-10 stagger-item pt-1">
            <h1 className="flex items-center gap-2.5 text-[28px] font-semibold tracking-tight text-text">
              {greeting || "Assalamu Alaikum"}
              <span aria-hidden="true">🌿</span>
            </h1>
            <p className="mt-1 text-base text-text-secondary">
              Find, read and reflect on the words of Allah
            </p>

            <div className="mt-2.5 max-w-[750px]">
              <AISearchBar
                value={query}
                onChange={setQuery}
                onSearch={(text) => void executeSearch(text)}
                onVoiceOpen={() => setVoiceOpen(true)}
                loading={loading}
                mode={mode}
                onModeChange={setMode}
              />
            </div>

            <div className="mt-2">
              <SemanticChips
                onTopic={runTopic}
                loading={loading}
                activeLabel={activeTopic}
                limit={5}
                noStagger
              />
            </div>
          </div>
        </div>

        {/* Continue Reading (2/3) + Quick Actions (1/3) */}
        <div className="stagger-item grid gap-3 lg:grid-cols-3" style={{ animationDelay: "60ms" }}>
          <div className="lg:col-span-2">
            <ContinueReadingCard />
          </div>
          <div className="lg:col-span-1">
            <QuickActions />
          </div>
        </div>

        {/* Recent Searches, Bookmarked Ayahs, Daily Reflection */}
        <div className="stagger-item grid gap-3 lg:grid-cols-3" style={{ animationDelay: "120ms" }}>
          <RecentSearchesCard onReopen={(q) => void executeSearch(q)} />
          <BookmarkedAyahsCard />
          <DailyReflectionCard />
        </div>

        {/* Discover */}
        <div className="stagger-item" style={{ animationDelay: "180ms" }}>
          <DiscoverMoreSection />
        </div>
      </div>

      {/* Search results — always mounted (even when empty) so resultsRef is
       * stable for the auto-scroll above; searching/reopening a query scrolls
       * this into view since it renders below the rest of the dashboard and
       * would otherwise be invisible without a manual scroll. Kept outside
       * the space-y stack above so it never contributes a phantom gap when
       * empty (Tailwind's space-y applies margin to every child regardless
       * of whether it renders anything). */}
      <div ref={resultsRef}>
        <SearchResultsPanel
          loading={loading}
          error={error}
          aiHint={aiHint}
          noMatchMessage={noMatchMessage}
          results={results}
          weakMatches={weakMatches}
          query={query}
        />
      </div>

      {voiceOpen && (
        <VoiceSearchModal open={voiceOpen} onClose={() => setVoiceOpen(false)} onResult={onVoiceSearch} />
      )}
    </>
  );
}
