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
  /** Keeps this row a single compact line — the full topic pool (used by
   * Discover More) is much larger than what belongs as a quick-prompt row. */
  limit?: number;
}

export function SemanticChips({ onTopic, loading, activeLabel, baseDelay = 0, noStagger = false, limit }: SemanticChipsProps) {
  const topics = limit ? SEARCH_TOPICS.slice(0, limit) : SEARCH_TOPICS;
  return (
    <div className="space-y-1">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-text-tertiary">Try asking</span>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 hide-scrollbar sm:mx-0 sm:flex-nowrap sm:overflow-x-auto sm:px-0 sm:pb-0">
        {topics.map((topic, i) => (
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
              "shrink-0 rounded-full border px-3.5 py-1 text-[13px] font-medium transition-colors duration-150 ease-out disabled:opacity-50 sm:shrink",
              activeLabel === topic.label
                ? "border-accent-border bg-accent-surface text-primary-hover shadow-[0_0_0_3px_var(--accent-surface)]"
                : "border-border bg-surface text-text-secondary hover:border-accent-border hover:bg-accent-surface hover:text-primary-hover"
            )}
          >
            {topic.label}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
