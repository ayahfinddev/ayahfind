"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Search, Sparkles } from "lucide-react";
import { placeholders } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

interface AISearchBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onVoiceOpen: () => void;
  loading?: boolean;
  mode?: "quran" | "hadith";
  onModeChange?: (m: "quran" | "hadith") => void;
}

export function AISearchBar({
  value,
  onChange,
  onSubmit,
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
    <motion.div
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-300",
        "bg-canvas backdrop-blur-xl",
        focused
          ? "border-ink/20 search-glow"
          : "border-glass-border"
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-canvas-elevated via-transparent to-canvas-elevated" />

      <div className="relative flex items-center gap-2 p-2 pl-4">
        <Sparkles
          className={cn(
            "h-5 w-5 shrink-0 transition-colors",
            focused ? "text-ink" : "text-ink-muted"
          )}
        />

        <div className="relative flex h-11 flex-1 items-center">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            className="w-full bg-transparent text-base leading-5 text-ink outline-none placeholder:text-transparent"
            aria-label="Search Quran or Hadith"
          />
          <AnimatePresence mode="wait">
            {!value && (
              <motion.span
                key={placeholderIdx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 0.62, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="pointer-events-none absolute inset-y-0 left-0 flex items-center text-base leading-5 text-ink-subtle"
              >
                {placeholders[placeholderIdx]}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onVoiceOpen}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-canvas-elevated text-ink"
          aria-label="Voice search"
        >
          <Mic className="h-5 w-5" />
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={onSubmit}
          disabled={loading || !value.trim()}
          className={cn(
            "flex h-11 items-center gap-2 rounded-xl px-4 font-medium transition-all",
            value.trim()
              ? "bg-accent text-canvas shadow-[0_0_20px_var(--accent-surface)]"
              : "bg-canvas-card text-ink-subtle"
          )}
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">{loading ? "..." : "Search"}</span>
        </motion.button>
      </div>

      {onModeChange && (
        <div className="flex gap-2 border-t border-glass-border bg-canvas-elevated/50 px-3 py-2.5">
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
              {m === "quran" ? "Quran" : "Hadith"}
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
