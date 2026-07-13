"use client";

import { useState } from "react";
import { ChevronDown, Loader2, RotateCcw, ScrollText } from "lucide-react";
import { fetchTafsir } from "@/lib/api";
import { getCachedTafsir, setCachedTafsir } from "@/lib/tafsirCache";
import { useTafsirAvailability } from "@/contexts/TafsirAvailabilityContext";
import type { TafsirEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

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

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && status === "idle") load();
  };

  const active = entries.find((e) => e.source_slug === activeSlug) ?? entries[0];

  if (!featureEnabled) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={`tafsir-panel-${surah}-${ayah}`}
        className={
          variant === "pill"
            ? cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                open ? "bg-accent-surface text-accent-dim" : "bg-canvas-card text-ink-muted hover:text-ink"
              )
            : "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-accent-dim transition-colors hover:bg-accent-surface"
        }
      >
        {variant === "pill" ? (
          <ScrollText className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
        )}
        Tafsir
      </button>

      {open && (
        <div
          id={`tafsir-panel-${surah}-${ayah}`}
          className="mt-3 w-full rounded-xl border border-border bg-canvas-card px-4 py-3.5"
        >
          {status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading tafsir…
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center justify-between gap-3 text-sm text-ink-muted">
              <span>Couldn&apos;t load tafsir.</span>
              <button
                type="button"
                onClick={load}
                className="flex items-center gap-1 font-medium text-accent-dim hover:opacity-80"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}

          {status === "empty" && (
            <p className="text-sm text-ink-muted">No tafsir available for this ayah yet.</p>
          )}

          {status === "loaded" && active && (
            <div>
              {contentEnvironment === "fixture" && (
                <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  Test fixture content — not verified tafsir
                </div>
              )}

              {entries.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {entries.map((e) => (
                    <button
                      key={e.source_slug}
                      type="button"
                      onClick={() => setActiveSlug(e.source_slug)}
                      className={cn(
                        "af-segment",
                        e.source_slug === activeSlug ? "af-segment-active" : "af-segment-inactive"
                      )}
                    >
                      {e.source_title}
                    </button>
                  ))}
                </div>
              )}

              <p
                className={cn(
                  "whitespace-pre-line text-sm leading-relaxed text-ink",
                  active.language === "ar" && "font-arabic text-right text-lg leading-loose"
                )}
                dir={active.language === "ar" ? "rtl" : "ltr"}
              >
                {active.text}
              </p>

              <p className="mt-3 text-xs text-ink-subtle">
                {active.source_title} — {active.author}
                {active.verse_start !== active.verse_end && (
                  <> · covers {active.verse_start}–{active.verse_end}</>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
