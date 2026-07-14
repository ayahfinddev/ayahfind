"use client";

import { useState } from "react";
import { Layers } from "lucide-react";
import { DEFAULT_RIWAYAH_ID, canCompareReadings, computeQiraatPanelRows } from "@/lib/riwayat";
import type { ReadingVariantsResponse } from "@/lib/types";
import { RiwayahBadge } from "./RiwayahBadge";
import { cn } from "@/lib/utils";
import { ExpandablePanel } from "@/components/ui/ExpandablePanel";

interface QiraatPanelProps {
  surah: number;
  ayah: number;
  data: ReadingVariantsResponse | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Permanent "Qira'at" action + expandable inline panel — always rendered
 * (unlike TafsirPanel, which hides itself when the feature is globally
 * off) since the button itself is a required, always-visible affordance
 * regardless of how many riwayat currently have real data.
 *
 * "Currently displayed" lists which enabled riwayat the exact wording on
 * screen belongs to; "Other readings" always lists every registered
 * riwayah so the architecture is visibly ready for them, but disabled
 * ones render as inert (non-clickable) rows — see RiwayahBadge, which
 * renders unavailable riwayat as a plain <span>, never a <button>.
 */
export function QiraatPanel({ surah, ayah, data, isLoading, isError }: QiraatPanelProps) {
  const [open, setOpen] = useState(false);
  const compareEnabled = canCompareReadings();

  const displayedRiwayahId = data?.canonical_riwayah_id ?? DEFAULT_RIWAYAH_ID;
  const equivalentRiwayahIds = data?.equivalent_riwayah_ids ?? [displayedRiwayahId];
  const { displayed, other } = computeQiraatPanelRows({ displayedRiwayahId, equivalentRiwayahIds });

  return (
    <ExpandablePanel
      open={open}
      onOpenChange={setOpen}
      showChevron={false}
      trigger={
        <>
          <Layers className="h-3.5 w-3.5" />
          Qira&apos;at
        </>
      }
      triggerClassName={cn(
        "rounded-lg px-3 py-1.5 text-xs",
        open ? "bg-accent-surface text-primary-hover" : "bg-surface-secondary text-text-secondary hover:text-text"
      )}
      panelClassName="max-w-full overflow-hidden"
    >
      {isLoading && (
        <p className="text-sm text-text-secondary" role="status">
          Loading reading information…
        </p>
      )}

      {isError && !isLoading && (
        <p className="text-sm text-text-secondary">Couldn&apos;t load reading information for this ayah.</p>
      )}

      {!isLoading && !isError && (
        <div className="space-y-3.5">
          <section aria-labelledby={`qiraat-displayed-${surah}-${ayah}`}>
            <p
              id={`qiraat-displayed-${surah}-${ayah}`}
              className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary"
            >
              Currently displayed
            </p>
            <div className="flex flex-wrap gap-1.5">
              {displayed.map((row) => (
                <RiwayahBadge key={row.riwayah.id} riwayah={row.riwayah} selected variant="row" />
              ))}
            </div>
          </section>

          <section aria-labelledby={`qiraat-other-${surah}-${ayah}`}>
            <p
              id={`qiraat-other-${surah}-${ayah}`}
              className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-tertiary"
            >
              Other readings
            </p>
            {/* Horizontally scrollable on narrow viewports rather than
                wrapping, with a small negative-margin/padding trick so
                the scroll affordance isn't clipped by the panel edge. */}
            <div className="-mx-1 flex flex-nowrap gap-1.5 overflow-x-auto px-1 pb-1" role="list">
              {other.map((row) => (
                <div key={row.riwayah.id} role="listitem" className="shrink-0">
                  <RiwayahBadge riwayah={row.riwayah} statusLabel={row.statusLabel} />
                </div>
              ))}
            </div>
          </section>

          <button
            type="button"
            disabled={!compareEnabled}
            aria-disabled={!compareEnabled}
            title={
              compareEnabled
                ? undefined
                : "Compare becomes available once at least two verified riwayah datasets are enabled"
            }
            className={cn(
              "w-full rounded-lg border px-3 py-2 text-xs font-semibold transition-colors",
              compareEnabled
                ? "border-accent-border text-primary-hover hover:bg-accent-surface"
                : "cursor-not-allowed border-border text-text-tertiary/60"
            )}
          >
            Compare readings
          </button>
        </div>
      )}
    </ExpandablePanel>
  );
}
