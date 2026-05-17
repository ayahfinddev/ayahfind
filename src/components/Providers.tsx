"use client";

import { AudioPlaybackProvider } from "@/contexts/AudioPlaybackContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AudioPlaybackProvider>{children}</AudioPlaybackProvider>;
}
