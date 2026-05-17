"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_RECITER_ID,
  RECITERS,
  RECITER_STORAGE_KEY,
  type ReciterId,
  getReciterById,
} from "@/lib/reciters";

function isReciterId(value: string): value is ReciterId {
  return RECITERS.some((r) => r.id === value);
}

export function useReciter() {
  const [reciterId, setReciterIdState] = useState<ReciterId>(DEFAULT_RECITER_ID);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECITER_STORAGE_KEY);
      if (stored && isReciterId(stored)) {
        setReciterIdState(stored);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setReciterId = useCallback((id: ReciterId) => {
    setReciterIdState(id);
    try {
      localStorage.setItem(RECITER_STORAGE_KEY, id);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("ayahfind-reciter-change", { detail: id }));
  }, []);

  useEffect(() => {
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<ReciterId>).detail;
      if (id) setReciterIdState(id);
    };
    window.addEventListener("ayahfind-reciter-change", onChange);
    return () => window.removeEventListener("ayahfind-reciter-change", onChange);
  }, []);

  return {
    reciterId,
    reciter: getReciterById(reciterId),
    setReciterId,
    ready,
  };
}