import { cache } from "react";
import { getSessionCookieValue } from "@/lib/auth/session-cookie";
import { getSessionUser } from "@/lib/services/auth-service";
import type { AuthenticatedUser } from "@/types/auth";

/**
 * Resolves the current authenticated user from the session cookie, hitting
 * the database. Memoized per request via React `cache()` so multiple guards
 * or components calling this during one render only trigger one query.
 */
export const getCurrentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const token = await getSessionCookieValue();
    if (!token) return null;
    return getSessionUser(token);
  }
);
