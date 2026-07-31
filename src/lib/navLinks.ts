import { BookOpen, Home, ScrollText, Search, Settings, type LucideIcon } from "lucide-react";

export interface NavLink {
  href: string;
  icon: LucideIcon;
  label: string;
  /** Matched against the pathname for active state when the destination and
   * the "section" differ — Quran points at the *last-read* ayah, but every
   * `/ayah/...` route belongs to that nav item. */
  activeHref?: string;
  /** `href` is a placeholder resolved at render time — see `useNavLinks`. */
  dynamic?: "reader";
}

/** Exactly five: Home, Search, Quran, Hadith, Settings. Saved / History /
 * Symbols / About were pulled out of the nav and live in the Home page's
 * Quick Actions grid instead (see components/home/QuickActions.tsx). */
export const NAV_LINKS: NavLink[] = [
  { href: "/home", icon: Home, label: "Home" },
  { href: "/search", icon: Search, label: "Search" },
  { href: "/ayah/1/1", icon: BookOpen, label: "Quran", activeHref: "/ayah", dynamic: "reader" },
  { href: "/hadith", icon: ScrollText, label: "Hadith" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

/** A link matches itself and any nested route beneath it (e.g. a future
 * `/ayah/...` under a link). `/` keeps its exact-match special case in case
 * a root link ever returns. */
export function isNavLinkActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
