"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.startsWith("/onboarding")) return;
    const done = localStorage.getItem("ayahfind_onboarded");
    if (!done) router.replace("/onboarding");
  }, [pathname, router]);

  return <>{children}</>;
}
