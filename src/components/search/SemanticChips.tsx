"use client";

import { motion } from "framer-motion";
import { SEARCH_TOPICS, type SearchTopic } from "@/lib/searchTopics";
import { cn } from "@/lib/utils";

interface SemanticChipsProps {
  onTopic: (topic: SearchTopic) => void;
  loading?: boolean;
  activeLabel?: string | null;
}

export function SemanticChips({ onTopic, loading, activeLabel }: SemanticChipsProps) {
  return (
    <div className="-mt-0.5 flex flex-wrap gap-2">
      <span className="w-full text-xs font-medium text-neutral-500">Try asking</span>
      {SEARCH_TOPICS.map((topic, i) => (
        <motion.button
          key={topic.label}
          type="button"
          disabled={loading}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onTopic(topic)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
            activeLabel === topic.label
              ? "border-accent-teal/50 bg-accent-teal/10 text-accent-teal-dim"
              : "border-neutral-300 bg-white text-neutral-800 hover:border-accent-teal/40 hover:text-neutral-950"
          )}
        >
          {topic.label}
        </motion.button>
      ))}
    </div>
  );
}
