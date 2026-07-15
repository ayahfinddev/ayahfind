import { NextResponse, type NextRequest } from "next/server";

/** Old shared links pointed search queries at the root (`/?q=...`). The
 * search app now lives at /search, so forward those links permanently.
 * Scoped to `/` only — every other route is untouched. */
export function middleware(request: NextRequest) {
  if (request.nextUrl.searchParams.has("q")) {
    const url = request.nextUrl.clone();
    url.pathname = "/search";
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/",
};
