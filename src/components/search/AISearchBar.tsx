"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Search, Sparkles } from "lucide-react";
import { placeholders } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface AISearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSearch: (value: string) => void;
  onVoiceOpen: () => void;
  loading?: boolean;
  mode?: "quran" | "hadith";
  onModeChange?: (m: "quran" | "hadith") => void;
}

export function AISearchBar({
  value,
  onChange,
  onSearch,
  onVoiceOpen,
  loading,
  mode = "quran",
  onModeChange,
}: AISearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % placeholders.length);
    }, 3500);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className={cn(
        "relative max-w-[750px] overflow-hidden rounded-[20px] bg-surface transition-shadow duration-150 ease-out",
        focused ? "shadow-md search-glow" : "shadow-sm hover:shadow-md"
      )}
    >
      {/* Main input row */}
      <div className="flex h-16 items-center gap-4 px-6 md:px-7">
        <Sparkles
          className={cn(
            "h-6 w-6 shrink-0 transition-colors duration-150 ease-out",
            focused ? "text-primary-hover" : "text-text-tertiary"
          )}
        />

        <div className="relative flex h-8 flex-1 items-center">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const q = value.trim();
                if (q) onSearch(q);
              }
            }}
            className="w-full bg-transparent text-lg leading-6 text-text outline-none placeholder:text-transparent md:text-xl"
            aria-label="Search Quran or Hadith"
          />
          <AnimatePresence mode="wait">
            {!value && (
              <motion.span
                key={placeholderIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-lg leading-6 text-text-tertiary md:text-xl"
              >
                {placeholders[placeholderIdx]}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onVoiceOpen}
            className="flex h-10 w-10 items-center justify-center rounded-2xl text-text-tertiary transition-colors duration-150 ease-out hover:bg-surface-secondary hover:text-text"
            aria-label="Voice search"
          >
            <Mic className="h-5 w-5" />
          </motion.button>

          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              const q = value.trim();
              if (q) onSearch(q);
            }}
            disabled={!value.trim() || loading}
            className={cn(
              "flex h-11 items-center gap-2 rounded-2xl px-5 text-base font-semibold transition-colors duration-150 ease-out md:h-12 md:px-6",
              value.trim()
                ? "bg-primary text-white shadow-sm hover:bg-primary-hover"
                : "bg-surface-secondary text-text-tertiary cursor-not-allowed"
            )}
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{loading ? "..." : "Search"}</span>
          </motion.button>
        </div>
      </div>

      {/* Mode toggle */}
      {onModeChange && (
        <div className="flex gap-1.5 border-t border-border bg-background/50 px-6 py-1 md:px-8">
          <span className="mr-1 self-center text-xs text-text-tertiary">Search in:</span>
          {(["quran", "hadith"] as const).map((m) => (
            <motion.button
              key={m}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onModeChange(m)}
              className={cn(
                "af-segment py-1",
                mode === m ? "af-segment-active" : "af-segment-inactive"
              )}
            >
              {m === "quran" ? "Qur'an" : "Hadith"}
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
