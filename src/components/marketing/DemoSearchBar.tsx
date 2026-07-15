"use client";

import { Mic, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DemoSearchBarProps {
  /** Text shown inside the bar. */
  query: string;
  /** Render the focused glow state (used while the query is "typing"). */
  active?: boolean;
  /** Show a blinking caret after the query text. */
  caret?: boolean;
  dir?: "rtl";
  className?: string;
}

/** Non-interactive visual replica of the real AISearchBar (see
 * src/components/search/AISearchBar.tsx) for the landing-page scenes —
 * same shell, spacing, icons and buttons, but purely presentational so the
 * marketing page never mounts search state, contexts or backend calls. */
export function DemoSearchBar({ query, active, caret, dir, className }: DemoSearchBarProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-[20px] bg-surface",
        active ? "shadow-md search-glow-static" : "shadow-sm",
        className
      )}
    >
      <div className="flex h-14 items-center gap-3 px-5 md:h-16 md:gap-4 md:px-7">
        <Sparkles
          className={cn(
            "h-5 w-5 shrink-0 md:h-6 md:w-6",
            active ? "text-primary-hover" : "text-text-tertiary"
          )}
        />
        <div
          className="flex h-8 flex-1 items-center overflow-hidden whitespace-nowrap text-base leading-6 text-text md:text-xl"
          dir={dir}
        >
          <span>{query}</span>
          {caret && (
            <span className="demo-caret ml-0.5 inline-block h-5 w-px bg-primary md:h-6" />
          )}
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl text-text-tertiary md:h-10 md:w-10">
            <Mic className="h-4 w-4 md:h-5 md:w-5" />
          </span>
          <span
            className={cn(
              "flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-semibold md:h-12 md:px-6 md:text-base",
              query.trim()
                ? "bg-primary text-white shadow-sm"
                : "bg-surface-secondary text-text-tertiary"
            )}
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
          </span>
        </div>
      </div>
    </div>
  );
}
