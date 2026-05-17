"use client";

import { BISMILLAH_AR } from "@/lib/quranDisplay";

export function BismillahHeader() {
  return (
    <div className="reader-bismillah mb-8 rounded-2xl border border-glass-border bg-gradient-to-b from-accent-teal/[0.07] to-white px-6 py-7 text-center shadow-card md:mb-10 md:px-10 md:py-9">
      <p
        className="font-arabic text-[1.65rem] leading-[2.1] text-neutral-900 md:text-[1.85rem]"
        dir="rtl"
        lang="ar"
      >
        {BISMILLAH_AR}
      </p>
    </div>
  );
}
