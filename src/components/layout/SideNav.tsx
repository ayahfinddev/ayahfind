"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchNavClick } from "@/contexts/SearchHomeContext";
import { NAV_LINKS, isNavLinkActive } from "@/lib/navLinks";
import { cn } from "@/lib/utils";

export function SideNav() {
  const pathname = usePathname();
  const onSearchNavClick = useSearchNavClick();
  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden h-dvh w-[4.75rem] flex-col pt-safe md:flex lg:w-60"
      style={{ backgroundColor: "var(--sidebar-bg)" }}
    >
      {/* Logo */}
      <div className="px-4 py-5 lg:px-5">
        <div className="hidden items-center gap-2.5 lg:flex">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            A
          </span>
          <span className="text-[15px] font-semibold tracking-tight" style={{ color: "var(--sidebar-text)" }}>
            AyahFind
          </span>
        </div>
        <div className="flex items-center justify-center lg:hidden">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            A
          </span>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4" aria-label="Main">
        {NAV_LINKS.map(({ href, icon: Icon, label }) => {
          const active = isNavLinkActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              onClick={(e) => onSearchNavClick(href, e)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ease-out"
              style={{
                backgroundColor: active ? "var(--sidebar-active)" : "transparent",
                color: active ? "var(--sidebar-text)" : "var(--sidebar-text-muted)",
              }}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
