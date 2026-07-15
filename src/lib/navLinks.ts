import { BookMarked, BookOpen, Clock, Home, Info, ScrollText, Settings, type LucideIcon } from "lucide-react";

export interface NavLink {
  href: string;
  icon: LucideIcon;
  label: string;
}

export const NAV_LINKS: NavLink[] = [
  { href: "/search", icon: Home, label: "Search" },
  { href: "/hadith", icon: ScrollText, label: "Hadith" },
  { href: "/bookmarks", icon: BookMarked, label: "Saved" },
  { href: "/history", icon: Clock, label: "History" },
  { href: "/symbols", icon: BookOpen, label: "Symbols" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/about", icon: Info, label: "About" },
];

/** A link matches itself and any nested route beneath it (e.g. a future
 * `/ayah/...` under a link). `/` keeps its exact-match special case in case
 * a root link ever returns. */
export function isNavLinkActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
