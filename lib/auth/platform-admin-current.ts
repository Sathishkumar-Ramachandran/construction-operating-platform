import { cache } from "react";
import { getPlatformAdminSessionCookieValue } from "@/lib/auth/platform-admin-session-cookie";
import { getPlatformAdminSessionUser } from "@/lib/services/platform-admin-auth-service";
import type { AuthenticatedPlatformAdmin } from "@/types/platform-admin-auth";

/** Mirrors lib/auth/current-user.ts's getCurrentUser, for the completely
 * separate Platform Admin identity. */
export const getCurrentPlatformAdmin = cache(
  async (): Promise<AuthenticatedPlatformAdmin | null> => {
    const token = await getPlatformAdminSessionCookieValue();
    if (!token) return null;
    return getPlatformAdminSessionUser(token);
  }
);
