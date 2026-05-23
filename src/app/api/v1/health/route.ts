import { NextResponse } from "next/server";

export const maxDuration = 30;

function upstreamBase(): string {
  const fromEnv = process.env.API_UPSTREAM_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") return "http://127.0.0.1:8000";
  return "";
}

export async function GET() {
  const base = upstreamBase();
  if (!base) {
    return NextResponse.json({
      status: "degraded",
      backend_alive: false,
      proxy_ok: true,
      error: "API_UPSTREAM_URL not set",
    });
  }
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${base}/api/v1/health`, { signal: controller.signal, cache: "no-store" });
    const data = await res.json();
    return NextResponse.json({ ...data, proxy_ok: true, upstream: base });
  } catch (e) {
    return NextResponse.json({
      status: "degraded",
      backend_alive: false,
      proxy_ok: true,
      upstream: base,
      error: e instanceof Error ? e.message : String(e),
    }, { status: 503 });
  } finally {
    clearTimeout(t);
  }
}