"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn, formatConfidence } from "@/lib/utils";

interface ConfidenceBadgeProps {
  score: number;
  size?: "sm" | "md";
  className?: string;
  tier?: "weak";
}

export function ConfidenceBadge({
  score,
  size = "md",
  className,
  tier,
}: ConfidenceBadgeProps) {
  const high = score >= 0.85;
  const medium = score >= 0.55;
  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm",
        tier === "weak"
          ? "bg-canvas-card text-ink-subtle ring-1 ring-border-strong"
          : high
            ? "bg-ink text-canvas ring-1 ring-ink"
            : medium
              ? "bg-canvas-card text-ink ring-1 ring-border-strong"
              : "bg-canvas-elevated text-ink-muted ring-1 ring-border",
        className
      )}
    >
      <Sparkles className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {formatConfidence(score)}
    </motion.span>
  );
}
