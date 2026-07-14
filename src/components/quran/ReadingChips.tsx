"use client";

import { useState } from "react";
import { computeReadingChipsState } from "@/lib/riwayat";
import type { ReadingVariantsResponse } from "@/lib/types";
import { CommonToAllBadge, RiwayahBadge } from "./RiwayahBadge";

interface ReadingChipsProps {
  data: ReadingVariantsResponse | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Descriptive-only chips shown near the Arabic text on a search-result
 * card: which *enabled* riwayat share the exact form currently displayed.
 * These never act as selectors — clicking "+N" only reveals the rest,
 * it never changes what's displayed (that's the Qira'at panel's job).
 *
 * Takes reading-variants data as props (rather than fetching itself) so a
 * card that also renders the Qira'at panel shares one fetch instead of
 * two — see AyahResultCard, which calls useReadingVariants once.
 */
export function ReadingChips({ data, isLoading, isError }: ReadingChipsProps) {
  const [expanded, setExpanded] = useState(false);

  const state = computeReadingChipsState({
    equivalentRiwayahIds: data?.equivalent_riwayah_ids,
    hasReadingVariants: Boolean(data?.has_reading_variants),
    isLoading,
    isError,
  });

  if (state.kind === "loading") {
    return (
      <div
        className="mt-2 h-5 w-24 animate-pulse rounded-full bg-canvas-card"
        aria-label="Loading reading information"
        role="status"
      />
    );
  }

  if (state.kind === "unavailable") return null;

  if (state.kind === "common-to-all") {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Reading chips">
        <CommonToAllBadge />
      </div>
    );
  }

  const visible = expanded ? state.all : state.shown;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label="Reading chips">
      {visible.map((riwayah) => (
        <RiwayahBadge key={riwayah.id} riwayah={riwayah} />
      ))}
      {!expanded && state.overflowCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="rounded-full border border-border px-2 py-1 text-[11px] font-medium text-ink-subtle transition-colors hover:bg-canvas-card hover:text-ink"
          aria-label={`Show ${state.overflowCount} more readings that share this wording`}
        >
          +{state.overflowCount}
        </button>
      )}
    </div>
  );
}
