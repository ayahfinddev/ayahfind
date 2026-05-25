import { NextResponse } from "next/server";
import { getServerUpstreamBase } from "@/lib/apiConfig";

export const maxDuration = 30;

export async function GET() {
  const base = getServerUpstreamBase();
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