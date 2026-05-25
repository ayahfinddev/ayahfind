"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Clock, Home, ScrollText, Settings } from "lucide-react";
import { useSearchNavClick } from "@/contexts/SearchHomeContext";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", icon: Home, label: "Search" },
  { href: "/hadith", icon: ScrollText, label: "Hadith" },
  { href: "/bookmarks", icon: BookMarked, label: "Saved" },
  { href: "/history", icon: Clock, label: "History" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function SideNav() {
  const pathname = usePathname();
  const onSearchNavClick = useSearchNavClick();
  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-[4.75rem] flex-col border-r border-border bg-canvas pt-safe md:flex lg:w-52">
      <div className="border-b border-border px-4 py-5">
        <p className="hidden text-lg font-bold tracking-tight text-ink lg:block">
          AyahFind
        </p>
        <p className="text-center text-lg font-bold text-ink lg:hidden">AF</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Main">
        {links.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => onSearchNavClick(href, e)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-ink text-canvas"
                  : "text-ink-muted hover:bg-canvas-elevated hover:text-ink"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}