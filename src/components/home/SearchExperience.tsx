"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Brain, ChevronDown, ChevronUp, SearchX } from "lucide-react";
import { ContinueReadingCard } from "@/components/home/ContinueReadingCard";
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

const MUSHAF_URL = "https://images.pexels.com/photos/14743719/pexels-photo-14743719.jpeg";
const LEAVES_URL = "https://images.pexels.com/photos/17085794/pexels-photo-17085794.jpeg";

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
  const resultsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addQuery } = useSearchHistory();

  modeRef.current = mode;
  const { registerReset } = useSearchHome();
  const playback = useAudioPlayback();
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
    void source;

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
      const data = await searchUnified(trimmed, 10);
      if (generation !== searchGeneration.current) return;
      const count = data.results?.length ?? 0;
      setResults(data.results ?? []);
      setWeakMatches(data.weak_matches ?? []);
      setNoMatchMessage(count === 0 && data.message ? data.message : null);
      setAiHint(data.intent_hint ?? data.normalized_query ?? null);
      const top = data.results?.[0];
      const ref = top ? `Qur'an ${top.surah}:${top.ayah}` : modeRef.current === "hadith" ? "Hadith" : undefined;
      addQuery(trimmed, ref);
    } catch (e) {
      if (generation !== searchGeneration.current) return;
      setError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
      setWeakMatches([]);
      setNoMatchMessage(null);
    } finally {
      if (generation === searchGeneration.current) setLoading(false);
    }
  }, [addQuery]);

  // Reopening a past search (from Recent Searches or /history) lands here as `?q=`.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) void executeSearch(q, "button");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onBarSearch = useCallback(
    (text: string) => void executeSearch(text, "button"),
    [executeSearch]
  );

  const onVoiceSearch = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q) return;
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
        setAiHint(data.intent_hint ? `Theme: ${data.intent_hint}` : `Related to ${topic.label}`);
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

  return (
    <>
    <div className="space-y-3">
      {/* Hero: greeting + search on the left, Mushaf + leaves on the right */}
      <div className="relative overflow-hidden rounded-2xl">
        <div className="mb-1 flex items-center justify-end">
          {/* No auth system exists yet — bell only, no avatar/name/sign-in
           * fabricated. Wire the rest of the account cluster in once real
           * auth lands. */}
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-text-tertiary transition-colors duration-150 ease-out hover:text-text"
          >
            <Bell className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative z-10">
            <h1 className="flex items-center gap-2 text-[26px] font-semibold text-text">
              {greeting || "Assalamu Alaikum"}
              <span aria-hidden="true">🌿</span>
            </h1>
            <p className="mt-1 text-base text-text-secondary">
              Find, read and reflect on the words of Allah
            </p>

            <div className="mt-2 max-w-[750px]">
              <AISearchBar
                value={query}
                onChange={setQuery}
                onSearch={onBarSearch}
                onVoiceOpen={() => setVoiceOpen(true)}
                loading={loading}
                mode={mode}
                onModeChange={setMode}
              />
            </div>

            <div className="mt-2">
              <SemanticChips onTopic={runTopic} loading={loading} activeLabel={activeTopic} limit={5} noStagger />
            </div>
          </div>

          {/* Mushaf on a rehal, framed by soft botanical leaves — real photos (Pexels, free license) */}
          <div className="relative hidden shrink-0 items-center justify-center lg:flex">
            <div
              aria-hidden="true"
              className="absolute h-52 w-52 rounded-full opacity-60 blur-3xl"
              style={{ background: "radial-gradient(circle, var(--gold, #F3E0A8), transparent 70%)" }}
            />
            <div
              className="relative h-52 w-52 overflow-hidden rounded-2xl"
              style={{
                maskImage: "radial-gradient(ellipse 78% 78% at center, black 60%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse 78% 78% at center, black 60%, transparent 100%)",
                filter: "drop-shadow(0 10px 24px rgba(0,0,0,0.18))",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={MUSHAF_URL} alt="A Qur'an resting on a wooden stand" className="h-full w-full object-cover" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={LEAVES_URL}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 top-1/2 h-60 w-36 -translate-y-1/2 rotate-6 object-cover opacity-[0.16]"
              style={{ maskImage: "linear-gradient(to left, black, transparent)", WebkitMaskImage: "linear-gradient(to left, black, transparent)" }}
            />
          </div>
        </div>
      </div>

      {/* Continue Reading (2/3) + Quick Actions (1/3) */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ContinueReadingCard />
        </div>
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>

      {/* Recent Searches, Bookmarked Ayahs, Daily Reflection */}
      <div className="grid gap-3 lg:grid-cols-3">
        <RecentSearchesCard onReopen={(q) => void executeSearch(q, "button")} />
        <BookmarkedAyahsCard />
        <DailyReflectionCard />
      </div>

      {/* Discover */}
      <DiscoverMoreSection />
    </div>

    {/* Search results — always mounted (even when empty) so resultsRef is
     * stable for the auto-scroll below; searching/reopening a query scrolls
     * this into view since it renders below the rest of the dashboard and
     * would otherwise be invisible without a manual scroll. Kept outside
     * the space-y-3 stack above so it never contributes a phantom gap when
     * empty (Tailwind's space-y applies margin to every child regardless
     * of whether it renders anything). */}
    <div ref={resultsRef}>
        {loading && (
          <div className="relative z-0 mt-6 space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
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
          <div className="mt-6">
            <ContentCard elevation="surface" padding="lg" className="text-center">
              <SearchX className="mx-auto mb-3 h-10 w-10 text-text-secondary" />
              <h2 className="text-lg font-semibold text-text">No confident match found</h2>
              <p className="mt-2 text-sm text-text-secondary">{noMatchMessage}</p>
            </ContentCard>
          </div>
        )}

        {!loading && results.length > 0 && (
          <section className="relative z-20 mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wider text-text-tertiary">
                {results.length} results
              </h2>
            </div>
            {results.map((r, i) => (
              <AyahResultCard key={`${r.surah}-${r.ayah}`} result={r} index={i} highlightQuery={query} noStagger />
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
              {weakOpen ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </button>
            {weakOpen && (
              <div className="mt-3 space-y-3 opacity-75">
                {weakMatches.map((r, i) => (
                  <AyahResultCard key={`weak-${r.surah}-${r.ayah}`} result={r} index={i} variant="weak" highlightQuery={query} noStagger />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {voiceOpen && (
        <VoiceSearchModal open={voiceOpen} onClose={() => setVoiceOpen(false)} onResult={onVoiceSearch} />
      )}
    </>
  );
}
