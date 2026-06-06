"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Brain, ChevronDown, ChevronUp, Loader2, SearchX } from "lucide-react";
import { ContinueReadingCard } from "@/components/home/ContinueReadingCard";
import { AISearchBar } from "@/components/search/AISearchBar";
import { VoiceSearchModal } from "@/components/search/VoiceSearchModal";
import { SemanticChips } from "@/components/search/SemanticChips";
import { AyahResultCard } from "@/components/results/AyahResultCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useRouter } from "next/navigation";
import { searchUnified } from "@/lib/api";
import { resolveTopicSearch } from "@/lib/resolveTopicSearch";
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

  modeRef.current = mode;
  const { registerReset } = useSearchHome();
  const playback = useAudioPlayback();
  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
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
      try {
        const hist: string[] = JSON.parse(localStorage.getItem("ayahfind_history") || "[]");
        const next = [trimmed, ...hist.filter((h) => h !== trimmed)].slice(0, 20);
        localStorage.setItem("ayahfind_history", JSON.stringify(next));
      } catch {
        /* ignore */
      }
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
    <>
      <header className="pb-4 pt-2 md:pt-2">
        <motion.p
          {...fade(0)}
          className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink-subtle"
        >
          AyahFind AI
        </motion.p>
        <motion.h1
          {...slideUp(0.08)}
          className="text-[1.625rem] font-bold leading-tight tracking-tight text-ink sm:text-3xl"
        >
          Search the Qur&apos;an &amp; Hadith{" "}
          <span className="text-gradient">naturally</span>
        </motion.h1>
        <motion.p
          {...fade(0.16)}
          className="mt-1.5 text-[0.8125rem] leading-relaxed text-ink-muted sm:mt-2 sm:text-sm"
        >
          Imperfect recitation, mixed languages, vague meanings — we still find what you meant.
        </motion.p>
      </header>

      <motion.div {...slideUp(0.24)}>
        <ContinueReadingCard />
      </motion.div>

      <motion.section {...slideUp(0.32)} className="space-y-1.5">
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
        />
      </motion.section>

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
        <p className="mt-4 rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-3 text-sm text-red-400 dark:border-red-400/20 dark:text-red-300">
          {error}
        </p>
      )}

      {aiHint && !loading && results.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-glass-border bg-canvas-elevated px-4 py-3 text-sm text-ink-muted">
          <Brain className="mt-0.5 h-4 w-4 shrink-0 text-ink" />
          <span>AI reconstructed intent · {aiHint}</span>
        </div>
      )}

      {!loading && noMatchMessage && results.length === 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border border-border-strong bg-canvas-elevated px-5 py-6 text-center"
        >
          <SearchX className="mx-auto mb-3 h-10 w-10 text-ink-muted" />
          <h2 className="text-lg font-semibold text-ink">
            No confident match found
          </h2>
          <p className="mt-2 text-sm text-ink-muted">{noMatchMessage}</p>
        </motion.section>
      )}

      {!loading && results.length > 0 && (
        <section className="relative z-20 mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-muted">
              {results.length} matches
            </h2>
            {loading && <Loader2 className="h-4 w-4 animate-spin text-ink" />}
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
            className="flex w-full items-center justify-between rounded-xl border border-glass-border bg-canvas-elevated px-4 py-3 text-left text-sm text-ink-muted hover:border-border-strong"
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
    </>
  );
}
