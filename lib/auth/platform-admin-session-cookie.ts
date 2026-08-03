import { cookies } from "next/headers";
import { PLATFORM_ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth/platform-admin-token";
import { env } from "@/lib/env";

export async function getPlatformAdminSessionCookieValue(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(PLATFORM_ADMIN_SESSION_COOKIE_NAME)?.value;
}

export async function setPlatformAdminSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(PLATFORM_ADMIN_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/platform-admin",
    expires: expiresAt,
  });
}

export async function clearPlatformAdminSessionCookie() {
  const store = await cookies();
  store.delete({ name: PLATFORM_ADMIN_SESSION_COOKIE_NAME, path: "/platform-admin" });
}
