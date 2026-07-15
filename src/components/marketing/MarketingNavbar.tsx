"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Search", href: "/search" },
  { label: "Download", href: "#download" },
  { label: "About", href: "/about" },
];

/** Fixed top navigation for the marketing homepage. Transparent while the
 * hero is on screen; gains a blurred glass background once the visitor has
 * scrolled. */
export function MarketingNavbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <nav
        aria-label="Marketing"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8"
      >
        <Link href="/" className="flex items-center gap-2.5" aria-label="AyahFind home">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            A
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-text">AyahFind</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={label}
              href={href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-text-secondary transition-colors duration-150 hover:text-text"
            >
              {label}
            </Link>
          ))}
        </div>

        <Link
          href="/search"
          className="btn-press rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-primary-hover"
        >
          Try AyahFind
        </Link>
      </nav>
    </header>
  );
}
