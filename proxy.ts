import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/token";
import { getSafeRedirectPath } from "@/lib/redirect";

// Routes that never require a session. Everything else under the matcher
// below is treated as protected. This is an OPTIMISTIC, cookie-presence-only
// check for fast redirects — the actual authorization boundary is
// requireUser()/requireRole()/requirePermission(), evaluated server-side on
// every protected layout, page, Server Action, and Route Handler.
const PUBLIC_PATHS = ["/", "/login", "/unauthorized"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE_NAME);

  if (pathname === "/login" && hasSessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!isPublicPath(pathname) && !hasSessionCookie) {
    const callbackUrl = getSafeRedirectPath(`${pathname}${search}`, pathname);
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", callbackUrl);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|api|favicon.ico|Logo.png|.*\\.svg$).*)",
  ],
};
