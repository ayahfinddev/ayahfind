"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { fetchReader } from "@/lib/api";
import type { AyahDetail } from "@/lib/types";
import { QuranReader } from "@/components/quran/QuranReader";

export default function AyahDetailPage() {
  const params = useParams();
  const surah = Number(params.surah);
  const ayahNum = Number(params.ayah);

  const [ayahs, setAyahs] = useState<AyahDetail[]>([]);
  const [meta, setMeta] = useState({ name_en: "", name_ar: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchReader(surah)
      .then((data) => {
        setAyahs(data.ayahs ?? []);
        setMeta({ name_en: data.name_en ?? "", name_ar: data.name_ar ?? "" });
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [surah]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-ink-muted">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-dim border-t-transparent" />
        <p className="text-sm">Loading surah…</p>
      </div>
    );
  }

  if (error || ayahs.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-base font-medium text-ink">Could not load Surah {surah}</p>
        <p className="max-w-xs text-sm text-ink-muted">
          The server may be waking up. This usually takes under 30 seconds.
        </p>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-2 rounded-xl bg-accent-dim px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <QuranReader
      surah={surah}
      surahNameEn={meta.name_en}
      surahNameAr={meta.name_ar}
      ayahs={ayahs}
      initialAyah={ayahNum}
    />
  );
}
