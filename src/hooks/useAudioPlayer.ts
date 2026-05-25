"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function playWithFallback(
  primarySrc: string,
  fallbackSrc: string | undefined,
  audioRef: React.MutableRefObject<HTMLAudioElement | null>,
  onStop: () => void,
  onPlaying: () => void
) {
  let triedFallback = false;
  const audio = new Audio(primarySrc);
  audioRef.current = audio;

  const handleError = () => {
    if (!triedFallback && fallbackSrc && audio.src !== fallbackSrc) {
      triedFallback = true;
      audio.src = fallbackSrc;
      void audio.play().then(onPlaying).catch(onStop);
      return;
    }
    onStop();
  };

  audio.onended = onStop;
  audio.onerror = handleError;
  void audio.play().then(onPlaying).catch(onStop);
}

/** Single audio instance per card — toggle play/stop on repeated clicks. */
export function useAudioPlayer(src: string, fallbackSrc?: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.onended = null;
      a.onerror = null;
      a.removeAttribute("src");
      a.load();
    }
    audioRef.current = null;
    setPlaying(false);
  }, []);

  useEffect(() => {
    stop();
  }, [src, fallbackSrc, stop]);

  useEffect(() => () => stop(), [stop]);

  const toggle = useCallback(() => {
    if (playing && audioRef.current) {
      stop();
      return;
    }
    stop();
    playWithFallback(src, fallbackSrc, audioRef, stop, () => setPlaying(true));
  }, [playing, src, fallbackSrc, stop]);

  return { playing, toggle, stop };
}
