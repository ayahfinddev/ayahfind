"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

export interface MarketingMotion {
  /** Visitor prefers reduced motion — scenes render their static variant. */
  reduced: boolean;
  /** Wide viewport — full cinematic choreography. Mobile gets shorter
   * pinned tracks and drops decorative parallax layers. */
  desktop: boolean;
  /** SSR-safe: false until mounted, so the first client render matches the
   * server render before media queries are known. */
  mounted: boolean;
}

export function useMarketingMotion(): MarketingMotion {
  const reduced = useReducedMotion() ?? false;
  const [desktop, setDesktop] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    setMounted(true);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return { reduced, desktop, mounted };
}
