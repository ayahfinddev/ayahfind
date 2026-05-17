"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Single audio instance per card — toggle play/stop on repeated clicks. */
export function useAudioPlayer(src: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
      a.onended = null;
      a.onerror = null;
    }
    audioRef.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => {
    stop();
  }, [src, stop]);

  useEffect(() => () => stop(), [stop]);

  const toggle = useCallback(() => {
    if (playing && audioRef.current) {
      stop();
      return;
    }
    stop();
    const a = new Audio(src);
    audioRef.current = a;
    a.onended = () => stop();
    a.onerror = () => stop();
    void a.play().then(() => setPlaying(true)).catch(() => stop());
  }, [playing, src, stop]);

  return { playing, toggle, stop };
}