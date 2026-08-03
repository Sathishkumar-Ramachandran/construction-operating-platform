import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/token";
import { PLATFORM_ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth/platform-admin-token";
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

/**
 * /platform-admin is a completely separate, cross-tenant identity with its
 * own cookie (PLATFORM_ADMIN_SESSION_COOKIE_NAME) — it must never be
 * evaluated against the regular per-company SESSION_COOKIE_NAME check
 * below, and the regular check must never treat it as a protected route
 * needing a User session either. Same "optimistic pre-check only" caveat
 * applies — requirePlatformAdmin() is the real boundary.
 */
function handlePlatformAdminRoute(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasPlatformAdminCookie = request.cookies.has(PLATFORM_ADMIN_SESSION_COOKIE_NAME);

  if (pathname === "/platform-admin/login" && hasPlatformAdminCookie) {
    return NextResponse.redirect(new URL("/platform-admin", request.url));
  }

  if (pathname !== "/platform-admin/login" && !hasPlatformAdminCookie) {
    return NextResponse.redirect(new URL("/platform-admin/login", request.url));
  }

  return NextResponse.next();
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/platform-admin")) {
    return handlePlatformAdminRoute(request);
  }

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
