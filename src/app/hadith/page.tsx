"use client";

import { ScrollText } from "lucide-react";
import Link from "next/link";

export default function HadithPage() {
  return (
    <div className="px-1 pt-8 sm:px-5">
      <div className="glass-panel flex flex-col items-center p-8 text-center">
        <ScrollText className="mb-4 h-12 w-12 text-ink-subtle" />
        <h1 className="text-xl font-bold text-ink">Hadith search</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Unified narration cards, isnad chains, and scholar grading - coming in Phase 3.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-xl bg-accent-surface px-4 py-2 text-sm font-medium text-accent-dim"
        >
          Try Quran search meanwhile
        </Link>
      </div>
    </div>
  );
}