import { type NextRequest,NextResponse } from "next/server";

const REFRESH_COOKIE = "__Host-apcs_refresh";

const PUBLIC_PATHS = new Set([
  "/",
  "/features",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/etsy/callback",
  "/opengraph-image",
  "/twitter-image",
]);

const GUEST_ONLY_PATHS = new Set([
  "/login",
  "/register",
  "/features",
  "/forgot-password",
  "/reset-password",
]);

// Optimistic cookie-presence check only; the client guards remain authoritative and still
// run the silent-refresh flow. A present-but-expired refresh cookie just falls through here.
export const proxy = (request: NextRequest) => {
  const { pathname, search } = request.nextUrl;
  const hasRefreshCookie = request.cookies.has(REFRESH_COOKIE);

  if (GUEST_ONLY_PATHS.has(pathname)) {
    if (hasRefreshCookie) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  if (!PUBLIC_PATHS.has(pathname) && !hasRefreshCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?returnUrl=${encodeURIComponent(`${pathname}${search}`)}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
