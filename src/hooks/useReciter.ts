"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RECITER_STORAGE_KEY,
  getReciterById,
  isEnabledReciterId,
  readStoredReciterId,
  type ReciterId,
} from "@/lib/reciters";

export function useReciter() {
  const [reciterId, setReciterIdState] = useState<ReciterId>(() => readStoredReciterId());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReciterIdState(readStoredReciterId());
    setReady(true);
  }, []);

  const setReciterId = useCallback((id: ReciterId) => {
    if (!isEnabledReciterId(id)) return;
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
      if (id && isEnabledReciterId(id)) setReciterIdState(id);
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
