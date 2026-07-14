"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Brain, ChevronDown, ChevronUp, SearchX } from "lucide-react";
import { ContinueReadingCard } from "@/components/home/ContinueReadingCard";
import { MushafVisual } from "@/components/home/MushafVisual";
import { IslamicPatternBg } from "@/components/home/IslamicPatternBg";
import { QuickActions } from "@/components/home/QuickActions";
import { RecentSearchesCard } from "@/components/home/RecentSearchesCard";
import { BookmarkedAyahsCard } from "@/components/home/BookmarkedAyahsCard";
import { DailyReflectionCard } from "@/components/home/DailyReflectionCard";
import { DiscoverMoreSection } from "@/components/home/DiscoverMoreSection";
import { AISearchBar } from "@/components/search/AISearchBar";
import { VoiceSearchModal } from "@/components/search/VoiceSearchModal";
import { SemanticChips } from "@/components/search/SemanticChips";
import { AyahResultCard } from "@/components/results/AyahResultCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { ContentCard } from "@/components/ui/ContentCard";
import { useRouter, useSearchParams } from "next/navigation";
import { searchUnified } from "@/lib/api";
import { resolveTopicSearch } from "@/lib/resolveTopicSearch";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { getGreeting } from "@/lib/utils";
import type { SearchTopic } from "@/lib/searchTopics";
import type { SearchCandidate, SearchMode } from "@/lib/types";
import { useAudioPlayback } from "@/contexts/AudioPlaybackContext";
import { useSearchHome } from "@/contexts/SearchHomeContext";

type SearchSource = "button" | "enter" | "voice";

export function SearchExperience() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("quran");
  const [results, setResults] = useState<SearchCandidate[]>([]);
  const [weakMatches, setWeakMatches] = useState<SearchCandidate[]>([]);
  const [noMatchMessage, setNoMatchMessage] = useState<string | null>(null);
  const [weakOpen, setWeakOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const searchGeneration = useRef(0);
  const modeRef = useRef(mode);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addQuery } = useSearchHistory();

  modeRef.current = mode;
  const { registerReset } = useSearchHome();
  const playback = useAudioPlayback();
  const [isMobile, setIsMobile] = useState(true);
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    setGreeting(getGreeting());
  }, []);

  const resetToLanding = useCallback(() => {
    playback.stop();
    setQuery("");
    setResults([]);
    setWeakMatches([]);
    setNoMatchMessage(null);
    setWeakOpen(false);
    setLoading(false);
    setError(null);
    setVoiceOpen(false);
    setAiHint(null);
    setActiveTopic(null);
  }, [playback]);

  useEffect(() => {
    registerReset(resetToLanding);
    return () => registerReset(null);
  }, [registerReset, resetToLanding]);

  const executeSearch = useCallback(async (raw: string, source: SearchSource) => {
    const trimmed = raw.trim();
    if (!trimmed) return;

    const generation = ++searchGeneration.current;
    console.log("[search] transcript finalized:", trimmed);
    console.log("[search] search invoked:", source);

    setQuery(trimmed);
    setActiveTopic(null);
    setLoading(true);
    setError(null);
    setNoMatchMessage(null);
    setWeakMatches([]);
    setWeakOpen(false);

    try {
      if (modeRef.current === "hadith") {
        setResults([]);
        setAiHint("Hadith semantic index coming soon — showing Quran matches for now.");
      }
      console.log("[search] Calling searchUnified:", trimmed);
      const data = await searchUnified(trimmed, 10);
      if (generation !== searchGeneration.current) {
        console.log("[search] stale response ignored");
        return;
      }
      const count = data.results?.length ?? 0;
      console.log("[search] results length:", count);
      setResults(data.results ?? []);
      setWeakMatches(data.weak_matches ?? []);
      setNoMatchMessage(count === 0 && data.message ? data.message : null);
      setAiHint(data.intent_hint ?? data.normalized_query ?? null);
      addQuery(trimmed);
    } catch (e) {
      if (generation !== searchGeneration.current) return;
      console.error("[search] error:", e);
      setError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
      setWeakMatches([]);
      setNoMatchMessage(null);
    } finally {
      if (generation === searchGeneration.current) {
        setLoading(false);
      }
    }
  }, [addQuery]);

  // Reopening a past search (from Recent Searches or /history) lands here as `?q=`.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) void executeSearch(q, "button");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onBarSearch = useCallback(
    (text: string) => {
      console.log("[search] Search button clicked:", text);
      void executeSearch(text, "button");
    },
    [executeSearch]
  );

  const onVoiceSearch = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q) return;
      console.log("[search] Voice transcript received:", q);
      setVoiceOpen(false);
      void executeSearch(q, "voice");
    },
    [executeSearch]
  );

  const runTopic = useCallback(
    async (topic: SearchTopic) => {
      setActiveTopic(topic.label);
      setQuery(topic.label);
      setLoading(true);
      setError(null);
      setNoMatchMessage(null);
      setWeakMatches([]);
      setWeakOpen(false);
      try {
        const data = await resolveTopicSearch(topic);
        setResults(data.results ?? []);
        setWeakMatches(data.weak_matches ?? []);
        if ((data.results?.length ?? 0) === 0) {
          router.push(`/ayah/${topic.surah}/${topic.ayah}`);
          return;
        }
        setNoMatchMessage(null);
        setAiHint(
          data.intent_hint
            ? `Theme: ${data.intent_hint}`
            : `Related to ${topic.label}`
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Search failed");
        setResults([]);
        router.push(`/ayah/${topic.surah}/${topic.ayah}`);
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  const fade = (delay: number) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.4, delay },
  });

  const slideUp = (delay: number) => ({
    initial: { opacity: 0, y: isMobile ? 0 : 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: isMobile ? 0 : delay },
  });

  return (
    <div className="space-y-0.5">
      {/* Hero: greeting + tagline beside a balancing Mushaf visual */}
      <div
        className="relative grid h-[190px] items-center gap-2 overflow-hidden rounded-[20px] px-6 lg:grid-cols-[1fr_auto] lg:px-9"
        style={{ background: "linear-gradient(135deg, #FDFBF7, #F3EBDA)" }}
      >
        {/* Warm ambient atmosphere — subtle, decorative only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <IslamicPatternBg className="absolute inset-0 h-full w-full opacity-[0.05]" color="#2F6B46" />
          <div
            className="absolute -right-16 -top-16 h-72 w-72 rounded-full opacity-[0.22] blur-3xl"
            style={{ background: "radial-gradient(circle, #D4AF37, transparent 70%)" }}
          />
          <div
            className="absolute -left-10 top-6 h-52 w-52 rounded-full opacity-[0.12] blur-3xl"
            style={{ background: "radial-gradient(circle, #2F6B46, transparent 70%)" }}
          />
        </div>

        <header>
          <motion.p
            {...slideUp(0.08)}
            className="flex items-center gap-2 font-serif text-[2.25rem] font-bold leading-tight text-text lg:text-[2.5rem]"
          >
            {greeting || "Assalamu Alaikum"}
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 shrink-0 text-[#2F6B46]" aria-hidden="true">
              <path d="M12 2c-4 4-8 9-8 13a8 8 0 0016 0c0-4-4-9-8-13z" fill="currentColor" opacity="0.85" />
            </svg>
          </motion.p>
          <motion.p
            {...fade(0.16)}
            className="mt-1.5 max-w-lg text-lg font-medium text-text-secondary"
          >
            Find, read and reflect on the words of Allah
          </motion.p>
        </header>

        <motion.div
          {...fade(0.2)}
          className="relative hidden shrink-0 items-center justify-center sm:flex"
        >
          <div
            aria-hidden="true"
            className="absolute h-40 w-40 rounded-full opacity-80 blur-2xl"
            style={{ background: "radial-gradient(circle, #F3E0A8, transparent 70%)" }}
          />
          {/* Botanical accents framing the Mushaf, never competing with it */}
          <svg aria-hidden="true" className="absolute -right-6 -top-4 h-16 w-16 text-[#4f8f5f] opacity-[0.18]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c-4 4-8 9-8 13a8 8 0 0016 0c0-4-4-9-8-13z" />
          </svg>
          <svg aria-hidden="true" className="absolute -bottom-2 right-10 h-10 w-10 text-[#4f8f5f] opacity-[0.15]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c-4 4-8 9-8 13a8 8 0 0016 0c0-4-4-9-8-13z" />
          </svg>
          <MushafVisual className="relative h-24 w-24 lg:h-28 lg:w-28" />
        </motion.div>
      </div>

      {/* Search — the dominant action on the page */}
      <motion.section {...slideUp(0.16)} className="space-y-1">
        <AISearchBar
          value={query}
          onChange={setQuery}
          onSearch={onBarSearch}
          onVoiceOpen={() => setVoiceOpen(true)}
          loading={loading}
          mode={mode}
          onModeChange={setMode}
        />
        <SemanticChips
          onTopic={runTopic}
          loading={loading}
          activeLabel={activeTopic}
          baseDelay={isMobile ? 0 : 0.4}
          noStagger={isMobile}
          limit={6}
        />
      </motion.section>

      {/* Continue Reading (centerpiece) + Quick Actions */}
      <motion.div {...slideUp(0.24)} className="grid gap-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContinueReadingCard />
        </div>
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </motion.div>

      {/* Recent Searches, Bookmarks, Daily Reflection */}
      <motion.div {...slideUp(0.32)} className="grid gap-2 lg:grid-cols-3">
        <RecentSearchesCard onReopen={(q) => void executeSearch(q, "button")} />
        <BookmarkedAyahsCard />
        <DailyReflectionCard />
      </motion.div>

      {/* Discover More */}
      <motion.div {...slideUp(0.4)}>
        <DiscoverMoreSection />
      </motion.div>

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none relative z-0 mt-6 space-y-3"
          aria-busy="true"
        >
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </motion.div>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      {aiHint && !loading && results.length > 0 && !aiHint.startsWith("multi_signal_fusion:") && (
        <ContentCard elevation="surface" padding="sm" className="mt-4 flex items-center gap-2.5">
          <Brain className="h-3.5 w-3.5 shrink-0 text-primary-hover" />
          <span className="text-[13px] text-text-secondary">
            {aiHint.startsWith("Showing results for") ? (
              <span>{aiHint}</span>
            ) : (
              <>
                AI matched your meaning
                <span className="ml-1 text-text-tertiary">· {aiHint}</span>
              </>
            )}
          </span>
        </ContentCard>
      )}

      {!loading && noMatchMessage && results.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6"
        >
          <ContentCard elevation="surface" padding="lg" className="text-center">
            <SearchX className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text">
              No confident match found
            </h2>
            <p className="mt-2 text-sm text-text-secondary">{noMatchMessage}</p>
          </ContentCard>
        </motion.div>
      )}

      {!loading && results.length > 0 && (
        <section className="relative z-20 mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
              {results.length} results
            </h2>
          </div>
          {results.map((r, i) => (
            <AyahResultCard
              key={`${r.surah}-${r.ayah}`}
              result={r}
              index={i}
              highlightQuery={query}
              noStagger={isMobile}
            />
          ))}
        </section>
      )}

      {!loading && weakMatches.length > 0 && (
        <section className="mt-4">
          <button
            type="button"
            onClick={() => setWeakOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl bg-surface px-4 py-3 text-left text-sm text-text-secondary shadow-xs transition-shadow duration-150 ease-out hover:shadow-sm"
          >
            <span>
              Low confidence matches (below 55%)
              {!weakOpen && ` · ${weakMatches.length} hidden`}
            </span>
            {weakOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" />
            )}
          </button>
          {weakOpen && (
            <div className="mt-3 space-y-3 opacity-75">
              {weakMatches.map((r, i) => (
                <AyahResultCard
                  key={`weak-${r.surah}-${r.ayah}`}
                  result={r}
                  index={i}
                  variant="weak"
                  highlightQuery={query}
                  noStagger={isMobile}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {voiceOpen && (
        <VoiceSearchModal
          open={voiceOpen}
          onClose={() => setVoiceOpen(false)}
          onResult={onVoiceSearch}
        />
      )}
    </div>
  );
}
