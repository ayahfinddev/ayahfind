"use client";

import { AudioPlaybackProvider } from "@/contexts/AudioPlaybackContext";
import { SearchHomeProvider } from "@/contexts/SearchHomeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SearchHomeProvider>
      <AudioPlaybackProvider>{children}</AudioPlaybackProvider>
    </SearchHomeProvider>
  );
}
