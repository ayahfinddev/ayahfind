"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useReciter } from "@/hooks/useReciter";
import { buildAyahAudioSources } from "@/lib/reciters";

export interface AyahRef {
  surah: number;
  ayah: number;
}

export interface QueueItem extends AyahRef {
  src: string;
  fallbackSrc?: string;
}

type PlaybackMode = "idle" | "single" | "queue";

interface AudioPlaybackContextValue {
  playing: boolean;
  mode: PlaybackMode;
  activeAyah: AyahRef | null;
  playSingle: (src: string, ref?: AyahRef, fallbackSrc?: string) => void;
  playQueue: (items: QueueItem[], startIndex: number) => void;
  toggleSingle: (src: string, ref?: AyahRef, fallbackSrc?: string) => void;
  toggleQueue: (items: QueueItem[], startIndex: number) => void;
  pause: () => void;
  stop: () => void;
  skipNext: () => void;
  skipPrev: () => void;
  isActiveVerse: (surah: number, ayah: number) => boolean;
}

const AudioPlaybackContext = createContext<AudioPlaybackContextValue | null>(null);

function attachPlaybackHandlers(
  audio: HTMLAudioElement,
  primarySrc: string,
  fallbackSrc: string | undefined,
  onEnded: () => void,
  onFailed: () => void,
  onPlaying: () => void
) {
  let triedFallback = false;
  audio.onended = onEnded;
  audio.onerror = () => {
    if (!triedFallback && fallbackSrc && audio.src !== fallbackSrc) {
      triedFallback = true;
      if (process.env.NODE_ENV === "development") {
        console.debug("[AyahFind audio] fallback", { from: primarySrc, to: fallbackSrc });
      }
      audio.src = fallbackSrc;
      void audio.play().then(onPlaying).catch(onFailed);
      return;
    }
    onFailed();
  };
}

export function AudioPlaybackProvider({ children }: { children: ReactNode }) {
  const { reciterId } = useReciter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const queueIndexRef = useRef(0);
  const modeRef = useRef<PlaybackMode>("idle");
  const prevReciterRef = useRef(reciterId);

  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<PlaybackMode>("idle");
  const [activeAyah, setActiveAyah] = useState<AyahRef | null>(null);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
      a.onended = null;
      a.onerror = null;
    }
    audioRef.current = null;
    queueRef.current = [];
    queueIndexRef.current = 0;
    modeRef.current = "idle";
    setPlaying(false);
    setMode("idle");
    setActiveAyah(null);
  }, []);

  const playAtQueueIndex = useCallback(
    (index: number) => {
      const item = queueRef.current[index];
      if (!item) {
        stop();
        return;
      }
      queueIndexRef.current = index;
      setActiveAyah({ surah: item.surah, ayah: item.ayah });

      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audioRef.current = audio;
      }

      attachPlaybackHandlers(
        audio,
        item.src,
        item.fallbackSrc,
        () => playAtQueueIndex(index + 1),
        () => playAtQueueIndex(index + 1),
        () => setPlaying(true)
      );

      audio.src = item.src;
      void audio.play().then(() => setPlaying(true)).catch(() => stop());
    },
    [stop]
  );

  const playQueue = useCallback(
    (items: QueueItem[], startIndex: number) => {
      if (!items.length) return;
      const idx = Math.max(0, Math.min(startIndex, items.length - 1));
      stop();
      queueRef.current = items;
      modeRef.current = "queue";
      setMode("queue");
      playAtQueueIndex(idx);
    },
    [playAtQueueIndex, stop]
  );

  const playSingle = useCallback(
    (src: string, ref?: AyahRef, fallbackSrc?: string) => {
      stop();
      modeRef.current = "single";
      setMode("single");
      if (ref) setActiveAyah(ref);

      const audio = new Audio(src);
      audioRef.current = audio;
      attachPlaybackHandlers(audio, src, fallbackSrc, () => stop(), () => stop(), () =>
        setPlaying(true)
      );
      void audio.play().then(() => setPlaying(true)).catch(() => stop());
    },
    [stop]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const toggleSingle = useCallback(
    (src: string, ref?: AyahRef, fallbackSrc?: string) => {
      const same =
        modeRef.current === "single" &&
        ref &&
        activeAyah?.surah === ref.surah &&
        activeAyah?.ayah === ref.ayah;
      if (playing && same) {
        stop();
        return;
      }
      playSingle(src, ref, fallbackSrc);
    },
    [activeAyah, playSingle, playing, stop]
  );

  const toggleQueue = useCallback(
    (items: QueueItem[], startIndex: number) => {
      const item = items[startIndex];
      if (!item) return;
      const same =
        modeRef.current === "queue" &&
        playing &&
        activeAyah?.surah === item.surah &&
        activeAyah?.ayah === item.ayah;
      if (same) {
        stop();
        return;
      }
      playQueue(items, startIndex);
    },
    [activeAyah, playQueue, playing, stop]
  );

  const skipNext = useCallback(() => {
    if (modeRef.current !== "queue") return;
    playAtQueueIndex(queueIndexRef.current + 1);
  }, [playAtQueueIndex]);

  const skipPrev = useCallback(() => {
    if (modeRef.current !== "queue") return;
    const audio = audioRef.current;
    if (audio && audio.currentTime > 2) {
      audio.currentTime = 0;
      return;
    }
    playAtQueueIndex(Math.max(0, queueIndexRef.current - 1));
  }, [playAtQueueIndex]);

  const isActiveVerse = useCallback(
    (surah: number, ayah: number) =>
      activeAyah?.surah === surah && activeAyah?.ayah === ayah && playing,
    [activeAyah, playing]
  );

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (prevReciterRef.current === reciterId) return;
    prevReciterRef.current = reciterId;

    const wasPlaying = playing;
    const prevMode = modeRef.current;
    const prevAyah = activeAyah;
    const prevQueueIndex = queueIndexRef.current;
    const prevQueue = queueRef.current.map((item) => ({ ...item }));

    stop();

    if (!wasPlaying || !prevAyah) return;

    if (prevMode === "single") {
      const { src, fallbackSrc } = buildAyahAudioSources(
        prevAyah.surah,
        prevAyah.ayah,
        reciterId
      );
      playSingle(src, prevAyah, fallbackSrc);
      return;
    }

    if (prevMode === "queue" && prevQueue.length) {
      const nextQueue = prevQueue.map((item) => {
        const sources = buildAyahAudioSources(item.surah, item.ayah, reciterId);
        return { ...item, ...sources };
      });
      playQueue(nextQueue, prevQueueIndex);
    }
  }, [reciterId, playing, activeAyah, stop, playSingle, playQueue]);

  return (
    <AudioPlaybackContext.Provider
      value={{
        playing,
        mode,
        activeAyah,
        playSingle,
        playQueue,
        toggleSingle,
        toggleQueue,
        pause,
        stop,
        skipNext,
        skipPrev,
        isActiveVerse,
      }}
    >
      {children}
    </AudioPlaybackContext.Provider>
  );
}

export function useAudioPlayback() {
  const ctx = useContext(AudioPlaybackContext);
  if (!ctx) {
    throw new Error("useAudioPlayback must be used within AudioPlaybackProvider");
  }
  return ctx;
}
