"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { AskSearchBar } from "@/components/search/AskSearchBar";
import { SearchResultsPanel } from "@/components/results/SearchResultsPanel";
import { useAyahSearch } from "@/hooks/useAyahSearch";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useSearchHome } from "@/contexts/SearchHomeContext";
import { cn } from "@/lib/utils";

/* Deliberately non-personalised: there is no account system, so nothing here
 * may greet anyone by name. */
const HEADING = "Find a verse, hadith, or topic";

const RECENT_LIMIT = 6;

/**
 * The dedicated search page: sidebar (from AppShell) + a slim brand top bar,
 * with a centred heading, search bar and recent searches. Results render in
 * place below the bar rather than navigating away.
 */
export function SearchLanding() {
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
    executeSearch,
    reset,
  } = useAyahSearch();

  const { history, historyRefs } = useSearchHistory();
  const { registerReset } = useSearchHome();
  const resultsRef = useRef<HTMLDivElement>(null);

  // Clicking "Search" in the nav while already here clears back to the
  // landing state (see contexts/SearchHomeContext).
  useEffect(() => {
    registerReset(reset);
    return () => registerReset(null);
  }, [registerReset, reset]);

  useEffect(() => {
    if (loading) {
      resultsRef.current?.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }, [loading]);

  const runSearch = useCallback((text: string) => void executeSearch(text), [executeSearch]);

  const hasResults = loading || results.length > 0 || !!error || !!noMatchMessage;
  const recent = history.slice(0, RECENT_LIMIT);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      {/* Top bar — logo only. No upgrade button, no avatar, no settings gear:
       * there are no accounts yet, so none of that would mean anything. */}
      <header className="flex items-center justify-between pb-6">
        <Link href="/home" aria-label="AyahFind home">
          <BrandLogo />
        </Link>
      </header>

      {/* Vertically centred while the page is empty; pinned to the top once
       * results push in below, so the bar doesn't drift down mid-search. */}
      <div
        className={cn(
          "flex w-full",
          hasResults ? "justify-center" : "flex-1 flex-col items-center justify-center pb-16"
        )}
      >
        {/* Ambient glow — a soft brand-green wash centred behind the search
         * bar, not a focus ring on the input. Alpha is themed
         * (`--search-glow-alpha` in globals.css): faint on the light
         * parchment grounds so it never reads as a stain, roughly double on
         * the dark ones so it registers at all.
         *
         * Capped at 88vw: a fixed 560px circle is wider than a phone
         * viewport, and since it's absolutely positioned it grew the document
         * and gave every page a horizontal scrollbar on mobile. */}
        <div className="relative w-full max-w-[720px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[min(560px,88vw)] w-[min(560px,88vw)] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgb(var(--primary-rgb) / var(--search-glow-alpha)) 0%, rgb(var(--primary-rgb) / 0) 70%)",
            }}
          />

          <h1 className="mb-6 text-center text-[26px] font-semibold tracking-tight text-text md:text-[32px]">
            {HEADING}
          </h1>

          <AskSearchBar
            value={query}
            onChange={setQuery}
            onSearch={runSearch}
            mode={mode}
            onModeChange={setMode}
            loading={loading}
          />

          {/* Recent searches — the same localStorage-backed history that feeds
           * "Recently Searched" on the dashboard and the /history page. */}
          {recent.length > 0 && (
            <section className="mt-7" aria-label="Recent searches">
              <h2 className="mb-2.5 text-center text-xs font-medium uppercase tracking-wider text-text-tertiary">
                Recent searches
              </h2>
              <ul className="flex flex-wrap justify-center gap-2">
                {recent.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      onClick={() => runSearch(q)}
                      className="flex max-w-full items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-text-secondary transition-colors duration-150 ease-out hover:border-accent-border hover:bg-accent-surface hover:text-primary-hover"
                    >
                      <Search className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{q}</span>
                      {historyRefs[q] && (
                        <span className="shrink-0 text-xs text-text-tertiary">{historyRefs[q]}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <div ref={resultsRef} className="mx-auto w-full max-w-[720px]">
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
    </div>
  );
}
