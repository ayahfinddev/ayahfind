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
            className={cn(
              "mx-auto w-full px-4 py-5 pb-24 md:px-5 md:py-6 md:pb-6 lg:px-8",
              isReader ? "max-w-4xl lg:max-w-5xl" : "max-w-3xl"
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