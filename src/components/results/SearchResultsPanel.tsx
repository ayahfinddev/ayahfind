"use client";

import { useState } from "react";
import { Brain, ChevronDown, ChevronUp, SearchX } from "lucide-react";
import { AyahResultCard } from "@/components/results/AyahResultCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { ContentCard } from "@/components/ui/ContentCard";
import type { SearchCandidate } from "@/lib/types";

export interface SearchResultsPanelProps {
  loading: boolean;
  error: string | null;
  aiHint: string | null;
  noMatchMessage: string | null;
  results: SearchCandidate[];
  weakMatches: SearchCandidate[];
  /** Drives term highlighting inside each card. */
  query: string;
}

/**
 * Skeletons → AI hint → results → the low-confidence disclosure. Shared by the
 * dashboard (`/home`) and the search page (`/search`) so a result renders the
 * same way wherever the search was run. The weak-match disclosure is local
 * state: it's a per-render UI affordance, not part of the search transaction.
 */
export function SearchResultsPanel({
  loading,
  error,
  aiHint,
  noMatchMessage,
  results,
  weakMatches,
  query,
}: SearchResultsPanelProps) {
  const [weakOpen, setWeakOpen] = useState(false);

  return (
    <>
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
            <AyahResultCard
              key={`${r.surah}-${r.ayah}`}
              result={r}
              index={i}
              highlightQuery={query}
              noStagger
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
                  noStagger
                />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
