"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchNavClick } from "@/contexts/SearchHomeContext";
import { useNavLinks } from "@/hooks/useNavLinks";
import { isNavLinkActive } from "@/lib/navLinks";
import { cn } from "@/lib/utils";

/** Mobile mirror of SideNav — the same five items, 1:1. Five fits the row
 * comfortably (the old seven-item version was the tight one); the longest
 * label is "Settings" at 8 characters. */
export function BottomNav() {
  const pathname = usePathname();
  const onSearchNavClick = useSearchNavClick();
  const navLinks = useNavLinks();
  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface/95 pb-safe backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-lg justify-around px-0.5 py-1.5">
        {navLinks.map(({ href, activeHref, icon: Icon, label }) => {
          const active = isNavLinkActive(activeHref ?? href, pathname);
          return (
            <Link
              key={label}
              href={href}
              onClick={(e) => onSearchNavClick(href, e)}
              aria-current={active ? "page" : undefined}
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
