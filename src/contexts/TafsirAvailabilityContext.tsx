"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { fetchTafsirStatus } from "@/lib/api";

/** Fetched once per app session, shared by every VerseCard so the Tafsir
 * button can be hidden entirely when the feature is disabled — rather than
 * every card independently discovering "unavailable" after being clicked.
 * Fails closed: until the check resolves (or if it fails), the button stays
 * hidden, since a button that only leads to a dead end is worse than a
 * brief absence of the button. */
const TafsirAvailabilityContext = createContext<boolean>(false);

export function TafsirAvailabilityProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const pathname = usePathname();
  // The marketing homepage renders no verse cards — don't probe the backend
  // from it. First navigation into the app remounts nothing, but the effect
  // re-runs when pathname leaves "/" and the status is fetched then.
  const isMarketing = pathname === "/";

  useEffect(() => {
    if (isMarketing) return;
    let cancelled = false;
    fetchTafsirStatus()
      .then((status) => {
        if (!cancelled) setEnabled(status.enabled);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isMarketing]);

  return (
    <TafsirAvailabilityContext.Provider value={enabled}>
      {children}
    </TafsirAvailabilityContext.Provider>
  );
}

export function useTafsirAvailability(): boolean {
  return useContext(TafsirAvailabilityContext);
}
