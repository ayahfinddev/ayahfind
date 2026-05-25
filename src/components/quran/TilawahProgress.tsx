"use client";

import { useAudioPlayback } from "@/contexts/AudioPlaybackContext";

/**
 * Ultra-thin progress line rendered at the top edge of the TilawahBar.
 * Isolated component to keep timeupdate re-renders (~4/s) from propagating
 * to the rest of the bar.
 */
export function TilawahProgress() {
  const { currentTime, duration } = useAudioPlayback();
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="absolute inset-x-0 top-0 h-[2px] bg-neutral-100">
      <div
        className="h-full bg-accent-teal/50 transition-[width] duration-200 ease-linear"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}