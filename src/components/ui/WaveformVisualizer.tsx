"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WaveformVisualizerProps {
  active: boolean;
  bars?: number;
  className?: string;
}

export function WaveformVisualizer({ active, bars = 24, className }: WaveformVisualizerProps) {
  return (
    <motion.div
      className={cn("flex h-16 items-end justify-center gap-1", className)}
      initial={false}
      animate={{ opacity: active ? 1 : 0.35 }}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-neutral-300 to-neutral-900"
          animate={
            active
              ? {
                  height: [8, 12 + Math.random() * 40, 10 + Math.random() * 28, 8],
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
