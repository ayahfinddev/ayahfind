"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Clock, Home, ScrollText, Settings } from "lucide-react";
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
  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-dvh w-[4.75rem] flex-col border-r border-neutral-200 bg-white md:w-52">
      <div className="border-b border-neutral-200 px-4 py-5">
        <p className="hidden text-lg font-bold tracking-tight text-neutral-900 md:block">
          AyahFind
        </p>
        <p className="text-center text-lg font-bold text-neutral-900 md:hidden">AF</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Main">
        {links.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}