"use client";

import { ThemeProvider } from "next-themes";
import { AudioPlaybackProvider } from "@/contexts/AudioPlaybackContext";
import { SearchHomeProvider } from "@/contexts/SearchHomeContext";
import { TafsirAvailabilityProvider } from "@/contexts/TafsirAvailabilityContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <SearchHomeProvider>
        <AudioPlaybackProvider>
          <TafsirAvailabilityProvider>{children}</TafsirAvailabilityProvider>
        </AudioPlaybackProvider>
      </SearchHomeProvider>
    </ThemeProvider>
  );
}
