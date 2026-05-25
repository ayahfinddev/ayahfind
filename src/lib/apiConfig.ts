const trim = (value: string | undefined) => value?.replace(/\/$/, "") ?? "";

/** Client fetch base — empty string uses same-origin /api/v1 (Vercel → Render proxy). */
export function getClientApiBase(): string {
  return trim(process.env.NEXT_PUBLIC_API_URL);
}

/** Server-side upstream for health checks and next.config rewrites. */
export function getServerUpstreamBase(): string {
  const fromEnv =
    trim(process.env.API_UPSTREAM_URL) ||
    trim(process.env.API_PROXY_URL) ||
    trim(process.env.BACKEND_URL);
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") return "http://127.0.0.1:8000";
  return "";
}

export type ApiSettingsDisplay =
  | { show: false }
  | { show: true; label: string; hint?: string };

/**
 * Settings UI — never expose localhost in production builds.
 * Production uses same-origin /api/v1 proxy; hide internal upstream from users.
 */
export function getApiSettingsDisplay(): ApiSettingsDisplay {
  const publicUrl = trim(process.env.NEXT_PUBLIC_API_URL);
  if (publicUrl) {
    return { show: true, label: publicUrl };
  }

  if (process.env.NODE_ENV === "production") {
    return { show: false };
  }

  return {
    show: true,
    label: getServerUpstreamBase() || "http://127.0.0.1:8000",
    hint: "Local development backend",
  };
}