import type { ReaderResponse, SearchResponse, TafsirResponse, TafsirStatusResponse } from "./types";
import { getClientApiBase } from "./apiConfig";

const API_BASE = getClientApiBase();

export async function searchUnified(
  query: string,
  topK = 10,
  surahContext?: number
): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/api/v1/search/unified`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK, surah_context: surahContext ?? null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? res.statusText);
  }
  return res.json();
}

export async function fetchReader(surah: number): Promise<ReaderResponse> {
  const res = await fetch(`${API_BASE}/api/v1/reader/${surah}`);
  if (!res.ok) throw new Error("Failed to load surah");
  return res.json();
}

export async function fetchTafsir(surah: number, ayah: number): Promise<TafsirResponse> {
  const res = await fetch(`${API_BASE}/api/v1/tafsir/${surah}/${ayah}`);
  if (!res.ok) throw new Error("Failed to load tafsir");
  return res.json();
}

export async function fetchTafsirStatus(): Promise<TafsirStatusResponse> {
  const res = await fetch(`${API_BASE}/api/v1/tafsir/status`);
  if (!res.ok) return { enabled: false };
  return res.json();
}

export async function searchAudio(file: Blob, topK = 8): Promise<SearchResponse> {
  const fd = new FormData();
  fd.append("file", file, "recitation.webm");
  const res = await fetch(`${API_BASE}/api/v1/search/audio?top_k=${topK}`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error("Audio search failed");
  return res.json();
}
