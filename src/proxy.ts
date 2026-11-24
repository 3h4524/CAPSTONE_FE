import { type NextRequest,NextResponse } from "next/server";

const REFRESH_COOKIE = "__Host-apcs_refresh";

const PRIVATE_SECTIONS = [
  "/admin",
  "/api-keys",
  "/batch-jobs",
  "/batches",
  "/change-password",
  "/dashboard",
  "/design-templates",
  "/market-insights",
  "/market-opportunities",
  "/mockups",
  "/profile",
  "/prompt-editor",
  "/settings",
  "/shop",
  "/styles",
  "/subscription",
  "/support",
  "/unauthorized",
  "/usage",
  "/workflows",
];

const isPrivatePath = (pathname: string) =>
  PRIVATE_SECTIONS.some((section) => pathname === section || pathname.startsWith(`${section}/`));

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

  if (isPrivatePath(pathname) && !hasRefreshCookie) {
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
