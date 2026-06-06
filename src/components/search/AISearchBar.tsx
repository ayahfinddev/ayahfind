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
        "relative overflow-hidden rounded-2xl transition-all duration-300",
        "bg-white",
        focused
          ? "shadow-[0_0_0_3px_rgba(13,148,136,0.15),0_4px_24px_rgba(0,0,0,0.08)] search-glow"
          : "shadow-[0_1px_3px_rgba(0,0,0,0.05),0_6px_20px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_28px_rgba(0,0,0,0.08)]"
      )}
    >
      {/* Main input row */}
      <div className="flex items-center gap-3 px-5 py-4">
        <Sparkles
          className={cn(
            "h-5 w-5 shrink-0 transition-colors duration-200",
            focused ? "text-accent-dim" : "text-ink-subtle"
          )}
        />

        <div className="relative flex h-7 flex-1 items-center">
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
            className="w-full bg-transparent text-[1.0625rem] leading-5 text-ink outline-none placeholder:text-transparent"
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
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-[1.0625rem] leading-5 text-ink-subtle"
              >
                {placeholders[placeholderIdx]}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onVoiceOpen}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-subtle transition-all hover:bg-canvas-card hover:text-ink"
            aria-label="Voice search"
          >
            <Mic className="h-4.5 w-4.5" />
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
              "flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all duration-200",
              value.trim()
                ? "bg-accent-dim text-white shadow-[0_2px_8px_rgba(13,148,136,0.3)] hover:shadow-[0_4px_12px_rgba(13,148,136,0.4)] hover:brightness-105"
                : "bg-canvas-card text-ink-subtle cursor-not-allowed"
            )}
          >
            <Search className="h-3.5 w-3.5" />
            <span>{loading ? "..." : "Search"}</span>
          </motion.button>
        </div>
      </div>

      {/* Mode toggle */}
      {onModeChange && (
        <div className="flex gap-1.5 border-t border-black/[0.05] bg-canvas/50 px-4 py-2.5">
          <span className="mr-1 self-center text-xs text-ink-subtle">Search in:</span>
          {(["quran", "hadith"] as const).map((m) => (
            <motion.button
              key={m}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onModeChange(m)}
              className={cn(
                "af-segment",
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
