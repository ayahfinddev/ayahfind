"use client";

import { useMemo } from "react";
import { useReadingProgress } from "@/hooks/useReadingProgress";
import { NAV_LINKS, type NavLink } from "@/lib/navLinks";

/**
 * NAV_LINKS with the "Quran" entry resolved to wherever the reader should
 * resume — the same last-read location that powers Continue Reading and the
 * Qur'an quick action, falling back to Al-Fatiha 1:1 before any reading
 * happens. Kept here (rather than in each nav) so SideNav and BottomNav can
 * never drift apart.
 */
export function useNavLinks(): NavLink[] {
  const { progress } = useReadingProgress();

  return useMemo(() => {
    const readerHref = progress ? `/ayah/${progress.surah}/${progress.ayah}` : "/ayah/1/1";
    return NAV_LINKS.map((link) =>
      link.dynamic === "reader" ? { ...link, href: readerHref } : link
    );
  }, [progress]);
}
