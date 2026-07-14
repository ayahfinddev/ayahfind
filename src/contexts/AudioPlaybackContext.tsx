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
import { usePathname } from "next/navigation";
import { useReciter } from "@/hooks/useReciter";
import { buildAyahAudioSources, getReciterById } from "@/lib/reciters";

/** Stop playback when leaving search/reader routes — never keep audio in the background. */
function shouldStopPlaybackOnRouteChange(prev: string | null, next: string): boolean {
  if (!prev || prev === next) return false;
  if (next === "/") return true;
  if (prev === "/") return true;
  const prevReader = prev.startsWith("/ayah/");
  const nextReader = next.startsWith("/ayah/");
  if (prevReader && !nextReader) return true;
  return false;
}

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
  currentTime: number;
  duration: number;
  /** Set when audio fell back to Alafasy because the selected reciter's file was unavailable. */
  fallbackWarning: string | null;
  /** Call this from standalone players when they silently fall back to the default reciter. */
  notifyFallback: (reciterName: string) => void;
  playSingle: (src: string, ref?: AyahRef, fallbackSrc?: string) => void;
  playQueue: (items: QueueItem[], startIndex: number) => void;
  toggleSingle: (src: string, ref?: AyahRef, fallbackSrc?: string) => void;
  toggleQueue: (items: QueueItem[], startIndex: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  skipNext: () => void;
  skipPrev: () => void;
  /** Jump queue playback to a verse (no-op if not in queue mode). */
  seekQueueAyah: (surah: number, ayah: number) => void;
  isActiveVerse: (surah: number, ayah: number) => boolean;
}

const AudioPlaybackContext = createContext<AudioPlaybackContextValue | null>(null);

function attachPlaybackHandlers(
  audio: HTMLAudioElement,
  primarySrc: string,
  fallbackSrc: string | undefined,
  onEnded: () => void,
  onFailed: () => void,
  onPlaying: () => void,
  onFallback?: () => void
) {
  let triedFallback = false;
  audio.onended = onEnded;
  audio.onerror = () => {
    if (!triedFallback && fallbackSrc && audio.src !== fallbackSrc) {
      triedFallback = true;
      onFallback?.();
      audio.src = fallbackSrc;
      void audio.play().then(onPlaying).catch(onFailed);
      return;
    }
    onFailed();
  };
}

export function AudioPlaybackProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { reciterId } = useReciter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevPathnameRef = useRef<string | null>(null);
  const queueRef = useRef<QueueItem[]>([]);
  const queueIndexRef = useRef(0);
  const modeRef = useRef<PlaybackMode>("idle");
  const prevReciterRef = useRef(reciterId);

  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<PlaybackMode>("idle");
  const [activeAyah, setActiveAyah] = useState<AyahRef | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fallbackWarning, setFallbackWarning] = useState<string | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFallbackWarning = useCallback((reciterName: string) => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    setFallbackWarning(reciterName);
    fallbackTimerRef.current = setTimeout(() => {
      setFallbackWarning(null);
      fallbackTimerRef.current = null;
    }, 4000);
  }, []);

  const clearAudioListeners = useCallback((a: HTMLAudioElement) => {
    a.onended = null;
    a.onerror = null;
    a.ontimeupdate = null;
    a.onloadedmetadata = null;
    a.ondurationchange = null;
  }, []);

  const attachTimingListeners = useCallback((a: HTMLAudioElement) => {
    a.ontimeupdate = () => setCurrentTime(a.currentTime);
    a.onloadedmetadata = () => setDuration(a.duration || 0);
    a.ondurationchange = () => setDuration(a.duration || 0);
  }, []);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      clearAudioListeners(a);
      a.removeAttribute("src");
      a.load();
    }
    audioRef.current = null;
    queueRef.current = [];
    queueIndexRef.current = 0;
    modeRef.current = "idle";
    setPlaying(false);
    setMode("idle");
    setActiveAyah(null);
    setCurrentTime(0);
    setDuration(0);
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setFallbackWarning(null);
  }, [clearAudioListeners]);

  const playAtQueueIndex = useCallback(
    (index: number) => {
      const item = queueRef.current[index];
      if (!item) {
        stop();
        return;
      }
      queueIndexRef.current = index;
      setActiveAyah({ surah: item.surah, ayah: item.ayah });
      setCurrentTime(0);
      setDuration(0);

      const prev = audioRef.current;
      if (prev) {
        prev.pause();
        clearAudioListeners(prev);
        prev.removeAttribute("src");
        prev.load();
      }

      const audio = new Audio();
      audioRef.current = audio;
      attachTimingListeners(audio);

      attachPlaybackHandlers(
        audio,
        item.src,
        item.fallbackSrc,
        () => playAtQueueIndex(index + 1),
        () => playAtQueueIndex(index + 1),
        () => setPlaying(true),
        () => showFallbackWarning(getReciterById(reciterId).name)
      );

      audio.src = item.src;
      void audio.play().then(() => setPlaying(true)).catch(() => stop());
    },
    [stop, clearAudioListeners, attachTimingListeners, reciterId, showFallbackWarning]
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
      attachTimingListeners(audio);
      attachPlaybackHandlers(
        audio, src, fallbackSrc,
        () => stop(), () => stop(),
        () => setPlaying(true),
        () => showFallbackWarning(getReciterById(reciterId).name)
      );
      void audio.play().then(() => setPlaying(true)).catch(() => stop());
    },
    [stop, attachTimingListeners, reciterId, showFallbackWarning]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const resume = useCallback(() => {
    const a = audioRef.current;
    if (a && a.src && modeRef.current !== "idle") {
      void a.play().then(() => setPlaying(true)).catch(() => {});
    }
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

  const seekQueueAyah = useCallback(
    (surah: number, ayah: number) => {
      if (modeRef.current !== "queue") return;
      const idx = queueRef.current.findIndex(
        (item) => item.surah === surah && item.ayah === ayah
      );
      if (idx < 0) return;
      playAtQueueIndex(idx);
    },
    [playAtQueueIndex]
  );

  const isActiveVerse = useCallback(
    (surah: number, ayah: number) =>
      activeAyah?.surah === surah && activeAyah?.ayah === ayah && playing,
    [activeAyah, playing]
  );

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    const onPageHide = () => {
      const a = audioRef.current;
      if (a && a.paused) {
        clearAudioListeners(a);
        a.removeAttribute("src");
        a.load();
      }
    };
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, [clearAudioListeners]);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname;
    if (!pathname || modeRef.current === "idle") return;
    if (shouldStopPlaybackOnRouteChange(prev, pathname)) stop();
  }, [pathname, stop]);

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
        currentTime,
        duration,
        fallbackWarning,
        notifyFallback: showFallbackWarning,
        playSingle,
        playQueue,
        toggleSingle,
        toggleQueue,
        pause,
        resume,
        stop,
        skipNext,
        skipPrev,
        seekQueueAyah,
        isActiveVerse,
      }}
    >
      {children}
      {fallbackWarning && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed left-1/2 top-4 z-[100] -translate-x-1/2 rounded-full border border-glass-border bg-glass-fill px-4 py-2 text-center text-xs font-medium text-ink shadow-md backdrop-blur-sm"
        >
          {fallbackWarning} unavailable — playing Mishary Alafasy
        </div>
      )}
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
