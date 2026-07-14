"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

const SUPPORTED_THEMES = new Set(["light", "dark", "sand", "royal", "amoled", "system"]);

/**
 * Retired themes (emerald, midnight, the old forest) stay defined in
 * globals.css so they don't render as undefined CSS, but are no longer
 * offered in Settings. Anyone with one of those stored from before the
 * 5-theme reduction gets silently moved to Default on next load — not
 * left showing a theme they can no longer pick.
 */
export function ThemeMigration() {
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (theme && !SUPPORTED_THEMES.has(theme)) {
      setTheme("light");
    }
  }, [theme, setTheme]);

  return null;
}
