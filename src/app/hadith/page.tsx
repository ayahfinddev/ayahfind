"use client";

import { ScrollText } from "lucide-react";
import Link from "next/link";
import { ContentCard } from "@/components/ui/ContentCard";

export default function HadithPage() {
  return (
    <div className="px-1 pt-8 sm:px-5">
      <ContentCard elevation="surface" padding="lg" className="flex flex-col items-center text-center">
        <ScrollText className="mb-4 h-12 w-12 text-text-tertiary" />
        <h1 className="text-xl font-bold text-text">Hadith search</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Unified narration cards, isnad chains, and scholar grading - coming in Phase 3.
        </p>
        <Link
          href="/search"
          className="mt-6 rounded-xl border border-border-strong bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-surface-secondary"
        >
          Try Quran search meanwhile
        </Link>
      </ContentCard>
    </div>
  );
}
