"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

export function GlassPanel({ children, className, ...props }: GlassPanelProps) {
  return (
    <motion.div className={cn("glass-panel", className)} {...props}>
      {children}
    </motion.div>
  );
}
