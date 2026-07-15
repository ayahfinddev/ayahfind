import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ayahfind.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Per-user routes with no crawlable content.
      disallow: ["/api/", "/history", "/bookmarks", "/settings", "/onboarding"],
    },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
