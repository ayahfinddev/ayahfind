"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchUnified } from "@/lib/api";
import { resolveTopicSearch } from "@/lib/resolveTopicSearch";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useAudioPlayback } from "@/contexts/AudioPlaybackContext";
import type { SearchTopic } from "@/lib/searchTopics";
import type { SearchCandidate, SearchMode } from "@/lib/types";

/**
 * The whole Qur'an search transaction — query, mode, results and the two ways
 * to run one (a typed/spoken query, or a semantic topic chip). Lifted out of
 * SearchExperience unchanged so the dashboard (`/home`) and the search page
 * (`/search`) run *identical* search behaviour rather than two copies that
 * drift; the ranking pipeline and API calls are untouched.
 */
export function useAyahSearch() {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("quran");
  const [results, setResults] = useState<SearchCandidate[]>([]);
  const [weakMatches, setWeakMatches] = useState<SearchCandidate[]>([]);
  const [noMatchMessage, setNoMatchMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);

  const searchGeneration = useRef(0);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const router = useRouter();
  const searchParams = useSearchParams();
  const { addQuery } = useSearchHistory();
  const playback = useAudioPlayback();

  const executeSearch = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) return;

      const generation = ++searchGeneration.current;

      setQuery(trimmed);
      setActiveTopic(null);
      setLoading(true);
      setError(null);
      setNoMatchMessage(null);
      setWeakMatches([]);

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
        const ref = top
          ? `Qur'an ${top.surah}:${top.ayah}`
          : modeRef.current === "hadith"
            ? "Hadith"
            : undefined;
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
    },
    [addQuery]
  );

  const runTopic = useCallback(
    async (topic: SearchTopic) => {
      setActiveTopic(topic.label);
      setQuery(topic.label);
      setLoading(true);
      setError(null);
      setNoMatchMessage(null);
      setWeakMatches([]);
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

  const reset = useCallback(() => {
    playback.stop();
    setQuery("");
    setResults([]);
    setWeakMatches([]);
    setNoMatchMessage(null);
    setLoading(false);
    setError(null);
    setAiHint(null);
    setActiveTopic(null);
  }, [playback]);

  // Reopening a past search (Recent Searches, /history, or a shared
  // `?q=` link) lands here. Mount-only by design — later param changes come
  // from in-page searches that have already run.
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) void executeSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
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
  };
}
