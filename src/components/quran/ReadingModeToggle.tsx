"use client";

import { motion } from "framer-motion";
import type { ReadingMode } from "@/hooks/useReadingMode";
import { cn } from "@/lib/utils";

const MODES: { id: ReadingMode; label: string }[] = [
  { id: "verse", label: "Verse" },
  { id: "both", label: "Both" },
  { id: "arabic", label: "Arabic" },
  { id: "translation", label: "Translation" },
];

interface ReadingModeToggleProps {
  mode: ReadingMode;
  onChange: (mode: ReadingMode) => void;
}

export function ReadingModeToggle({ mode, onChange }: ReadingModeToggleProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Reading mode">
      {MODES.map((m) => (
        <motion.button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={mode === m.id}
          whileTap={{ scale: 0.97 }}
          onClick={() => onChange(m.id)}
          className={cn(
            "af-segment",
            mode === m.id ? "af-segment-active" : "af-segment-inactive"
          )}
        >
          {m.label}
        </motion.button>
      ))}
    </div>
  );
}
