import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ayahfind.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/search`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${BASE}/hadith`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/symbols`, changeFrequency: "monthly", priority: 0.3 },
  ];
}
