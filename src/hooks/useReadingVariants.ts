"use client";

import { useEffect, useState } from "react";
import { fetchReadingVariants } from "@/lib/api";
import { getCachedReadingVariants, setCachedReadingVariants } from "@/lib/readingVariantsCache";
import type { ReadingVariantsResponse } from "@/lib/types";

interface UseReadingVariantsResult {
  data: ReadingVariantsResponse | null;
  isLoading: boolean;
  isError: boolean;
}

/** Lightweight per-ayah metadata (canonical riwayah + which enabled riwayat
 * share its wording) — fetched lazily per search card and cached, never
 * loading a full alternative-riwayah text dataset up front. */
export function useReadingVariants(surah: number, ayah: number): UseReadingVariantsResult {
  const cached = getCachedReadingVariants(surah, ayah);
  const [data, setData] = useState<ReadingVariantsResponse | null>(cached ?? null);
  const [isLoading, setIsLoading] = useState(!cached);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const existing = getCachedReadingVariants(surah, ayah);
    if (existing) {
      setData(existing);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    fetchReadingVariants(surah, ayah)
      .then((result) => {
        if (cancelled) return;
        setCachedReadingVariants(surah, ayah, result);
        setData(result);
        setIsLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setIsError(true);
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [surah, ayah]);

  return { data, isLoading, isError };
}
