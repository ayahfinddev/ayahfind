"use client";

import { BISMILLAH_AR } from "@/lib/quranDisplay";
import { ReaderSection } from "@/components/ui/ReaderSection";

/**
 * Renders as the chapter's opening line, in the same visual rhythm as the
 * verse list below it — not a separate floating card.
 */
export function BismillahHeader() {
  return (
    <ReaderSection label="Bismillah" className="reader-bismillah border-b border-border pb-6 md:pb-8">
      <p
        className="font-arabic text-center text-arabic-md text-text"
        dir="rtl"
        lang="ar"
      >
        {BISMILLAH_AR}
      </p>
    </ReaderSection>
  );
}
