import { randomBytes, createHash } from "node:crypto";
import { env } from "@/lib/env";

/** Deliberately a distinct cookie name from SESSION_COOKIE_NAME — a
 * Platform Admin session and a regular per-company User session are
 * completely separate identities and must never be confused by a shared
 * cookie name or accidentally read by the wrong guard. */
export const PLATFORM_ADMIN_SESSION_COOKIE_NAME = "eop_platform_admin_session";

/** Shorter-lived than a regular 7-day User session — this is a
 * cross-tenant, high-privilege account with no per-company boundary. */
export const PLATFORM_ADMIN_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function generatePlatformAdminSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPlatformAdminSessionToken(rawToken: string): string {
  return createHash("sha256")
    .update(env.AUTH_SECRET)
    .update("platform-admin")
    .update(rawToken)
    .digest("hex");
}
