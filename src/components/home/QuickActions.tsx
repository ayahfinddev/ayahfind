"use client";

import Link from "next/link";
import { BookOpen, ScrollText, BookText, Layers, Shapes, BookMarked } from "lucide-react";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { ContentCard } from "@/components/ui/ContentCard";

/**
 * Tafsir and Qira'at have no standalone pages today — both route to the
 * reader (Continue Reading location, or Al-Fatiha 1:1 as a fallback),
 * same as the Qur'an tile. A real fix is dedicated landing pages for each;
 * tracked as a follow-up, not solved here.
 */
export function QuickActions() {
  const { progress } = useReadingProgress();
  const readerHref = progress ? `/ayah/${progress.surah}/${progress.ayah}` : "/ayah/1/1";

  // Each tile gets its own tint so the grid doesn't read as one uniform
  // color chip repeated six times.
  const actions = [
    { label: "Qur'an", icon: BookOpen, href: readerHref, color: "#2F6B46" },
    { label: "Hadith", icon: ScrollText, href: "/hadith", color: "#0d9488" },
    { label: "Tafsir", icon: BookText, href: readerHref, color: "#b45309" },
    { label: "Qira'at", icon: Layers, href: readerHref, color: "#0891b2" },
    { label: "Symbols", icon: Shapes, href: "/symbols", color: "#c2571b" },
    { label: "Bookmarks", icon: BookMarked, href: "/bookmarks", color: "#2563eb" },
  ];

  return (
    <ContentCard elevation="surface" padding="sm" className="h-full rounded-[20px] p-4">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-widest text-text-tertiary">Quick actions</h2>
      <div className="grid grid-cols-3 gap-1.5">
        {actions.map(({ label, icon: Icon, href, color }) => (
          <Link key={label} href={href} className="group">
            <div className="flex h-[54px] flex-col items-start justify-center gap-0.5 rounded-2xl border border-border bg-background/40 px-2.5 transition-all duration-150 ease-out group-hover:-translate-y-0.5 group-hover:border-transparent group-hover:shadow-sm">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-sm"
                style={{ backgroundColor: `${color}1e`, color }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="truncate text-xs font-semibold text-text">{label}</span>
            </div>
          </Link>
        ))}
      </div>
    </ContentCard>
  );
}
