import { cache } from "react";
import { getSessionCookieValue, clearSessionCookie } from "@/lib/auth/session-cookie";
import { getSessionUser } from "@/lib/services/auth-service";
import type { AuthenticatedUser } from "@/types/auth";

/**
 * Resolves the current authenticated user from the session cookie, hitting
 * the database. Memoized per request via React `cache()` so multiple guards
 * or components calling this during one render only trigger one query.
 *
 * A stale/invalid session (e.g. a cached cookie left over from before a
 * schema change, or a transient DB error) must never crash the page — it's
 * treated the same as "not logged in" so the caller's normal
 * redirect-to-login path handles it instead of an error boundary.
 */
export const getCurrentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const token = await getSessionCookieValue();
    if (!token) return null;

    try {
      return await getSessionUser(token);
    } catch (error) {
      console.error("Failed to resolve session; signing out.", error);
      try {
        await clearSessionCookie();
      } catch {
        // Cookies can only be mutated from a Server Action/Route Handler.
        // If we're rendering a Server Component, this is a no-op — the
        // stale cookie gets overwritten on the next successful login.
      }
      return null;
    }
  }
);
