"use client";

import { ThemeProvider } from "next-themes";
import { AudioPlaybackProvider } from "@/contexts/AudioPlaybackContext";
import { SearchHomeProvider } from "@/contexts/SearchHomeContext";
import { TafsirAvailabilityProvider } from "@/contexts/TafsirAvailabilityContext";
import { ThemeTransitionGuard } from "@/components/ThemeTransitionGuard";
import { ThemeMigration } from "@/components/ThemeMigration";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      themes={["light", "dark", "sand", "royal", "amoled"]}
    >
      <ThemeTransitionGuard />
      <ThemeMigration />
      <SearchHomeProvider>
        <AudioPlaybackProvider>
          <TafsirAvailabilityProvider>{children}</TafsirAvailabilityProvider>
        </AudioPlaybackProvider>
      </SearchHomeProvider>
    </ThemeProvider>
  );
}
