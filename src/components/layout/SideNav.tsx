"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, BookOpen, Clock, Home, ScrollText, Settings } from "lucide-react";
import { useSearchNavClick } from "@/contexts/SearchHomeContext";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", icon: Home, label: "Search" },
  { href: "/hadith", icon: ScrollText, label: "Hadith" },
  { href: "/bookmarks", icon: BookMarked, label: "Saved" },
  { href: "/history", icon: Clock, label: "History" },
  { href: "/symbols", icon: BookOpen, label: "Symbols" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function SideNav() {
  const pathname = usePathname();
  const onSearchNavClick = useSearchNavClick();
  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-dvh w-[4.75rem] flex-col border-r border-black/[0.06] bg-white pt-safe md:flex lg:w-52">
      {/* Logo */}
      <div className="px-4 py-5 lg:px-5">
        <div className="hidden items-center gap-2.5 lg:flex">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-dim text-white text-sm font-bold">
            A
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">AyahFind</span>
        </div>
        <div className="flex items-center justify-center lg:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-dim text-white text-sm font-bold">
            A
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4" aria-label="Main">
        {links.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => onSearchNavClick(href, e)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-accent-surface text-accent-dim"
                  : "text-ink-muted hover:bg-canvas-card hover:text-ink"
              )}
            >
              <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-accent-dim")} />
              <span className="hidden lg:inline">{label}</span>
              {active && (
                <span className="ml-auto hidden h-1.5 w-1.5 rounded-full bg-accent lg:block" />
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
