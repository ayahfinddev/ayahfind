"use client";

import { useState } from "react";
import { Loader2, RotateCcw, ScrollText } from "lucide-react";
import { fetchTafsir } from "@/lib/api";
import { getCachedTafsir, setCachedTafsir } from "@/lib/tafsirCache";
import { useTafsirAvailability } from "@/contexts/TafsirAvailabilityContext";
import type { TafsirEntry } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ExpandablePanel } from "@/components/ui/ExpandablePanel";
import { Tabs } from "@/components/ui/Tabs";

interface TafsirPanelProps {
  surah: number;
  ayah: number;
  /** "link" (default) — small text+chevron toggle, used in the full reader.
   * "pill" — icon+label button matching the other action pills, used on
   * search result cards. No outer margin either way — wrap with spacing
   * as needed by the caller (the expanded panel is full-width so it wraps
   * onto its own line inside a flex row). */
  variant?: "link" | "pill";
}

type Status = "idle" | "loading" | "loaded" | "empty" | "error";

function TafsirEntryBody({ entry }: { entry: TafsirEntry }) {
  return (
    <div>
      <p
        className={cn(
          "whitespace-pre-line text-sm leading-relaxed text-text",
          entry.language === "ar" && "font-arabic text-right text-lg leading-loose"
        )}
        dir={entry.language === "ar" ? "rtl" : "ltr"}
      >
        {entry.text}
      </p>
      <p className="mt-3 text-xs text-text-tertiary">
        {entry.source_title} — {entry.author}
        {entry.verse_start !== entry.verse_end && (
          <> · covers {entry.verse_start}–{entry.verse_end}</>
        )}
      </p>
    </div>
  );
}

/** Collapsed by default on every card it's placed on. Fetching and expanded
 * state are local to this instance and only activate once the user opens
 * it — with many ayahs/results rendered at once, every other card stays an
 * inert button. Renders nothing at all when the feature is globally
 * disabled (see TafsirAvailabilityContext) — never a button that only
 * leads to an "unavailable" dead end. */
export function TafsirPanel({ surah, ayah, variant = "link" }: TafsirPanelProps) {
  const verseKey = `${surah}:${ayah}`;
  const featureEnabled = useTafsirAvailability();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [entries, setEntries] = useState<TafsirEntry[]>([]);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [contentEnvironment, setContentEnvironment] = useState<string | null>(null);

  const applyResult = (available: boolean, list: TafsirEntry[], contentEnv: string | null | undefined) => {
    setEntries(list);
    setContentEnvironment(contentEnv ?? null);
    if (!available || list.length === 0) {
      setStatus("empty");
      setActiveSlug(null);
      return;
    }
    setStatus("loaded");
    setActiveSlug(list.find((e) => e.language === "en")?.source_slug ?? list[0].source_slug);
  };

  const load = async () => {
    const cached = getCachedTafsir(verseKey);
    if (cached) {
      applyResult(cached.available, cached.entries, cached.content_environment);
      return;
    }
    setStatus("loading");
    try {
      const data = await fetchTafsir(surah, ayah);
      setCachedTafsir(verseKey, data);
      applyResult(data.available, data.entries, data.content_environment);
    } catch {
      setStatus("error");
    }
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && status === "idle") load();
  };

  if (!featureEnabled) return null;

  return (
    <ExpandablePanel
      open={open}
      onOpenChange={handleOpenChange}
      showChevron={variant === "link"}
      trigger={
        variant === "pill" ? (
          <>
            <ScrollText className="h-3.5 w-3.5" />
            Tafsir
          </>
        ) : (
          "Tafsir"
        )
      }
      triggerClassName={
        variant === "pill"
          ? cn(
              "rounded-lg px-3 py-1.5 text-xs",
              open ? "bg-accent-surface text-primary-hover" : "bg-surface-secondary text-text-secondary hover:text-text"
            )
          : "rounded-lg px-2.5 py-1 text-xs text-primary-hover hover:bg-accent-surface"
      }
    >
      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading tafsir…
        </div>
      )}

      {status === "error" && (
        <div className="flex items-center justify-between gap-3 text-sm text-text-secondary">
          <span>Couldn&apos;t load tafsir.</span>
          <button
            type="button"
            onClick={load}
            className="flex items-center gap-1 font-medium text-primary-hover hover:opacity-80"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {status === "empty" && (
        <p className="text-sm text-text-secondary">No tafsir available for this ayah yet.</p>
      )}

      {status === "loaded" && entries.length > 0 && (
        <div>
          {contentEnvironment === "fixture" && (
            <div className="mb-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
              Test fixture content — not verified tafsir
            </div>
          )}

          {entries.length > 1 ? (
            <Tabs
              value={activeSlug ?? entries[0].source_slug}
              onValueChange={setActiveSlug}
              items={entries.map((e) => ({
                id: e.source_slug,
                label: e.source_title,
                content: <TafsirEntryBody entry={e} />,
              }))}
            />
          ) : (
            <TafsirEntryBody entry={entries[0]} />
          )}
        </div>
      )}
    </ExpandablePanel>
  );
}
