"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSearchNavClick } from "@/contexts/SearchHomeContext";
import { useNavLinks } from "@/hooks/useNavLinks";
import { isNavLinkActive } from "@/lib/navLinks";
import { BrandLogo } from "./BrandLogo";

export function SideNav() {
  const pathname = usePathname();
  const onSearchNavClick = useSearchNavClick();
  const navLinks = useNavLinks();
  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <aside
      className="fixed left-0 top-0 z-40 hidden h-dvh w-[4.75rem] flex-col pt-safe md:flex lg:w-60"
      style={{ backgroundColor: "var(--sidebar-bg)" }}
    >
      {/* Logo */}
      <div className="px-4 py-5 lg:px-5">
        <BrandLogo
          className="hidden lg:flex"
          wordmarkClassName="text-[color:var(--sidebar-text)]"
        />
        <BrandLogo markOnly className="justify-center lg:hidden" />
      </div>

      {/* Nav links */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2 pb-4" aria-label="Main">
        {navLinks.map(({ href, activeHref, icon: Icon, label }) => {
          const active = isNavLinkActive(activeHref ?? href, pathname);
          return (
            <Link
              key={label}
              href={href}
              onClick={(e) => onSearchNavClick(href, e)}
              aria-current={active ? "page" : undefined}
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
