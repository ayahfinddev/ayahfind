"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

  useEffect(() => {
    setLoading(true);
    fetchReader(surah)
      .then((data) => {
        setAyahs(data.ayahs);
        setMeta({ name_en: data.name_en, name_ar: data.name_ar });
      })
      .finally(() => setLoading(false));
  }, [surah]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-neutral-500">
        Loading surah…
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
