"use client";

import Link from "next/link";
import { BookOpen, ScrollText, BookText, Layers, Shapes, BookMarked, Clock, Info } from "lucide-react";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { ContentCard } from "@/components/ui/ContentCard";

/**
 * Tafsir and Qira'at have no standalone pages today — both route to the
 * reader (Continue Reading location, or Al-Fatiha 1:1 as a fallback),
 * same as the Qur'an tile. A real fix is dedicated landing pages for each;
 * tracked as a follow-up, not solved here.
 *
 * Tile tint is a translucent wash of the icon's own color rather than a
 * fixed light pastel hex — a solid pastel would read as a "light card"
 * sitting on a dark background in every dark-style theme.
 *
 * Saved / History / About came out of the sidebar when it was cut to five
 * items and live here instead. "Saved" is the tile formerly labelled
 * "Bookmarks" — same /bookmarks destination, renamed to match the label the
 * sidebar used, rather than adding a second tile pointing at the same page.
 * Eight tiles across four columns keeps two rows (icons stay at h-11) so the
 * card's height still matches Continue Reading beside it.
 */
export function QuickActions() {
  const { progress } = useReadingProgress();
  const readerHref = progress ? `/ayah/${progress.surah}/${progress.ayah}` : "/ayah/1/1";

  const actions = [
    { label: "Qur'an", icon: BookOpen, href: readerHref, fg: "#1F7A52" },
    { label: "Hadith", icon: ScrollText, href: "/hadith", fg: "#1F7A52" },
    { label: "Tafsir", icon: BookText, href: readerHref, fg: "#A9631F" },
    { label: "Qira'at", icon: Layers, href: readerHref, fg: "#12897D" },
    { label: "Symbols", icon: Shapes, href: "/symbols", fg: "#C2570F" },
    { label: "Saved", icon: BookMarked, href: "/bookmarks", fg: "#3A66B0" },
    { label: "History", icon: Clock, href: "/history", fg: "#6B5BA8" },
    { label: "About", icon: Info, href: "/about", fg: "#4A7A8C" },
  ];

  return (
    <ContentCard elevation="surface" padding="sm" interactive className="h-full rounded-2xl border-l-2 border-l-primary/25 p-3.5">
      <h2 className="mb-2 text-base font-bold text-text">Quick Actions</h2>
      <div className="grid grid-cols-4 gap-1.5">
        {actions.map(({ label, icon: Icon, href, fg }) => (
          <Link key={label} href={href} className="group flex flex-col items-center gap-1.5 rounded-xl p-1.5 text-center transition-colors duration-150 ease-out hover:bg-surface-secondary">
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl transition-transform duration-200 ease-out group-hover:-rotate-6 group-hover:scale-110"
              style={{ backgroundColor: `${fg}20`, color: fg }}
            >
              <Icon className="h-5 w-5" />
            </span>
            <span className="text-xs font-medium text-text">{label}</span>
          </Link>
        ))}
      </div>
    </ContentCard>
  );
}
