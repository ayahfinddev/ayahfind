"use client";

import { useEffect } from "react";

/**
 * Any element with a `transition-colors`/`transition-all` class whose color
 * comes from a `var()` custom property can get stuck mid-transition and
 * never repaint to the new theme's value when `data-theme` swaps — observed
 * on both `body` and ordinary buttons. Disabling transitions for one paint
 * cycle around the swap is the standard fix for this class of bug.
 */
export function ThemeTransitionGuard() {
  useEffect(() => {
    const root = document.documentElement;
    let clearTimer: number | undefined;

    const clear = () => root.classList.remove("theme-switching");

    const observer = new MutationObserver(() => {
      root.classList.add("theme-switching");
      // rAF is the ideal signal (one frame with transitions off), but it can
      // be throttled in backgrounded/automated tabs — a timeout fallback
      // guarantees transitions never stay disabled indefinitely.
      window.clearTimeout(clearTimer);
      requestAnimationFrame(() => requestAnimationFrame(clear));
      clearTimer = window.setTimeout(clear, 100);
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      observer.disconnect();
      window.clearTimeout(clearTimer);
    };
  }, []);

  return null;
}
