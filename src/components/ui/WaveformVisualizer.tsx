"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WaveformVisualizerProps {
  active: boolean;
  bars?: number;
  className?: string;
  /** Per-bar overrides — the inline search-bar waveform needs flexible-width
   * brand-green bars instead of the modal's fixed-width neutral ones. */
  barClassName?: string;
  /** Peak bar height in px. Defaults to the modal's h-16 container. */
  maxHeight?: number;
}

export function WaveformVisualizer({
  active,
  bars = 24,
  className,
  barClassName,
  maxHeight = 52,
}: WaveformVisualizerProps) {
  return (
    <motion.div
      className={cn("flex h-16 items-end justify-center gap-1", className)}
      initial={false}
      animate={{ opacity: active ? 1 : 0.35 }}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(
            "w-1 rounded-full bg-gradient-to-t from-neutral-300 to-neutral-900",
            barClassName
          )}
          animate={
            active
              ? {
                  height: [
                    8,
                    12 + Math.random() * (maxHeight - 12),
                    10 + Math.random() * (maxHeight - 24),
                    8,
                  ],
                }
              : { height: 8 }
          }
          transition={{
            duration: 0.5 + (i % 5) * 0.08,
            repeat: active ? Infinity : 0,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}
