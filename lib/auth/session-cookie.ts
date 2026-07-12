import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth/token";
import { env } from "@/lib/env";

export async function getSessionCookieValue(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value;
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
