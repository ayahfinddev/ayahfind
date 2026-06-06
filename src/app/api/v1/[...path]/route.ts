import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

const HEALTH_TIMEOUT_MS = 8000;
const SEARCH_TIMEOUT_MS = 28000;

function upstreamBase(): string {
  const fromEnv = process.env.API_UPSTREAM_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") {
    return "http://127.0.0.1:8000";
  }
  return "";
}

async function fetchUpstream(
  target: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(target, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function searchFailedBody(details: string, query = "") {
  return {
    error: "search_failed",
    details,
    query,
    results: [],
    message: "Search is temporarily unavailable. Please try again shortly.",
  };
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const base = upstreamBase();
  const { path } = await ctx.params;
  const segment = path.join("/");
  const isSearch = segment === "search/unified" && req.method === "POST";

  if (!base) {
    if (isSearch) {
      return NextResponse.json(searchFailedBody("API_UPSTREAM_URL not configured"), { status: 503 });
    }
    return NextResponse.json(
      { status: "degraded", backend_alive: false, error: "API_UPSTREAM_URL not configured" },
      { status: 503 }
    );
  }

  const target = `${base}/api/v1/${segment}${req.nextUrl.search}`;
  const timeoutMs = isSearch ? SEARCH_TIMEOUT_MS : HEALTH_TIMEOUT_MS;

  const headers = new Headers(req.headers);
  headers.delete("host");

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.arrayBuffer();
  }

  const t0 = Date.now();
  try {
    const res = await fetchUpstream(target, init, timeoutMs);
    const outHeaders = new Headers(res.headers);
    outHeaders.delete("content-encoding");
    console.log("[api-proxy] ok", { target, status: res.status, ms: Date.now() - t0 });
    return new NextResponse(res.body, { status: res.status, headers: outHeaders });
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    console.error("[api-proxy] failed", { target, ms: Date.now() - t0, err });

    if (isSearch) {
      let query = "";
      try {
        const clone = req.clone();
        const body = await clone.json();
        query = typeof body.query === "string" ? body.query : "";
      } catch { /* ignore */ }
      return NextResponse.json(searchFailedBody(`Upstream unreachable: ${err}`, query), { status: 503 });
    }

    return NextResponse.json(
      {
        status: "degraded",
        backend_alive: false,
        proxy_ok: false,
        upstream: base,
        error: err,
        message: "API backend unreachable — waking or redeploying",
      },
      { status: 503 }
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;