import { randomBytes, createHash } from "node:crypto";
import { env } from "@/lib/env";

export const SESSION_COOKIE_NAME = "eop_session";
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Raw, high-entropy token that is stored client-side in the session cookie. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Only this hash is persisted in the database, peppered with AUTH_SECRET so
 * a database leak alone (without the server's secret) cannot forge or reuse
 * session tokens.
 */
export function hashSessionToken(rawToken: string): string {
  return createHash("sha256")
    .update(env.AUTH_SECRET)
    .update(rawToken)
    .digest("hex");
}
