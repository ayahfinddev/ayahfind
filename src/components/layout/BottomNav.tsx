"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchNavClick } from "@/contexts/SearchHomeContext";
import { NAV_LINKS, isNavLinkActive } from "@/lib/navLinks";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const onSearchNavClick = useSearchNavClick();
  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 pb-safe backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg justify-around px-0.5 py-1.5">
        {NAV_LINKS.map(({ href, icon: Icon, label }) => {
          const active = isNavLinkActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => onSearchNavClick(href, e)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-1.5 py-2 text-[10px] font-medium transition-colors duration-150 ease-out",
                active
                  ? "bg-accent-surface text-primary-hover"
                  : "text-text-tertiary hover:text-text-secondary"
              )}
            >
              <Icon className={cn("h-5 w-5", active && "text-primary-hover")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
