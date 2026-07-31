"use client";

import { usePathname } from "next/navigation";
import { SideNav } from "./SideNav";
import { BottomNav } from "./BottomNav";
import { OnboardingGate } from "@/components/home/OnboardingGate";
import { TilawahBar } from "@/components/quran/TilawahBar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = pathname?.startsWith("/ayah");
  // "/" is the marketing homepage, which renders chrome-free (no
  // sidebar/bottom nav, no onboarding redirect, no Tilawah bar) and owns its
  // own layout. The dashboard is /home; /search is the dedicated search page,
  // which centres itself vertically and so needs the full viewport height and
  // slimmer vertical padding.
  const isHome = pathname === "/home";
  const isSearch = pathname === "/search";

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <OnboardingGate>
      <div className="min-h-dvh bg-canvas pt-safe text-ink">
        <SideNav />
        <BottomNav />
        <main className="min-h-dvh pl-0 md:pl-[4.75rem] lg:pl-60">
          <div
            key={pathname}
            className={cn(
              "page-enter mx-auto w-full px-4 pb-24 md:px-6 md:pb-8 lg:px-9",
              isHome || isSearch ? "py-2.5 md:py-3" : "py-6 md:py-8",
              isHome
                ? "max-w-4xl lg:max-w-6xl xl:max-w-[1280px]"
                : isSearch
                  ? "max-w-4xl lg:max-w-5xl"
                  : isReader
                    ? "max-w-4xl lg:max-w-5xl"
                    : "max-w-3xl xl:max-w-4xl"
            )}
          >
            {children}
          </div>
        </main>
        <TilawahBar />
      </div>
    </OnboardingGate>
  );
}
