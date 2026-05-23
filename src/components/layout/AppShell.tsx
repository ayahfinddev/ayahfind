"use client";

import { usePathname } from "next/navigation";
import { SideNav } from "./SideNav";
import { OnboardingGate } from "@/components/home/OnboardingGate";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isReader = pathname?.startsWith("/ayah");

  return (
    <OnboardingGate>
      <div className="min-h-dvh bg-white text-neutral-900">
        <SideNav />
        <main className="min-h-dvh pl-[4.75rem] md:pl-52">
          <div
            className={cn(
              "mx-auto w-full px-5 py-6 md:px-8",
              isReader ? "max-w-4xl lg:max-w-5xl" : "max-w-3xl"
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </OnboardingGate>
  );
}