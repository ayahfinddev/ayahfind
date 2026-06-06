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

  return (
    <OnboardingGate>
      <div className="min-h-dvh bg-canvas pt-safe text-ink">
        <SideNav />
        <BottomNav />
        <main className="min-h-dvh pl-0 md:pl-[4.75rem] lg:pl-52">
          <div
            key={pathname}
            className={cn(
              "page-enter mx-auto w-full px-4 py-6 pb-24 md:px-6 md:py-8 md:pb-8 lg:px-10",
              isReader ? "max-w-4xl lg:max-w-5xl" : "max-w-3xl xl:max-w-4xl"
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
