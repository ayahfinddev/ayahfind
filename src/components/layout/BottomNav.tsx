"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, BookOpen, Clock, Home, Info, ScrollText, Settings } from "lucide-react";
import { useSearchNavClick } from "@/contexts/SearchHomeContext";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", icon: Home, label: "Search" },
  { href: "/hadith", icon: ScrollText, label: "Hadith" },
  { href: "/bookmarks", icon: BookMarked, label: "Saved" },
  { href: "/history", icon: Clock, label: "History" },
  { href: "/symbols", icon: BookOpen, label: "Symbols" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/about", icon: Info, label: "About" },
];

export function BottomNav() {
  const pathname = usePathname();
  const onSearchNavClick = useSearchNavClick();
  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/[0.06] bg-white/95 pb-safe backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg justify-around px-1 py-1.5">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => onSearchNavClick(href, e)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-medium transition-all duration-150",
                active ? "text-accent-dim" : "text-ink-subtle hover:text-ink-muted"
              )}
            >
              <Icon className={cn("h-5 w-5 transition-transform", active && "scale-110")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
