"use client";

import { motion } from "framer-motion";
import { SEARCH_TOPICS, type SearchTopic } from "@/lib/searchTopics";
import { cn } from "@/lib/utils";

interface SemanticChipsProps {
  onTopic: (topic: SearchTopic) => void;
  loading?: boolean;
  activeLabel?: string | null;
  baseDelay?: number;
  noStagger?: boolean;
}

export function SemanticChips({ onTopic, loading, activeLabel, baseDelay = 0, noStagger = false }: SemanticChipsProps) {
  return (
    <div className="space-y-2 pt-1">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Try asking</span>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {SEARCH_TOPICS.map((topic, i) => (
          <motion.button
            key={topic.label}
            type="button"
            disabled={loading}
            initial={{ opacity: 0, scale: noStagger ? 1 : 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: noStagger ? 0 : baseDelay + i * 0.045 }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onTopic(topic)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 disabled:opacity-50 sm:shrink",
              activeLabel === topic.label
                ? "border-accent-border bg-accent-surface text-accent-dim shadow-[0_0_0_3px_var(--accent-surface)]"
                : "border-black/[0.08] bg-white text-ink-muted hover:border-accent-border/50 hover:bg-accent-surface/50 hover:text-accent-dim"
            )}
          >
            {topic.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
