import { redirect } from "next/navigation";
import { getCurrentPlatformAdmin } from "@/lib/auth/platform-admin-current";
import type { AuthenticatedPlatformAdmin } from "@/types/platform-admin-auth";

/**
 * The security boundary for every /platform-admin page and Server Action —
 * mirrors requireUser() in lib/auth/guards.ts, but for the completely
 * separate Platform Admin identity. This tree is inherently cross-tenant
 * (it manages Company rows), so unlike the regular app's guards there is
 * no withTenant* variant here — every call in this area uses `rawDb`
 * directly, by design.
 */
export async function requirePlatformAdmin(): Promise<AuthenticatedPlatformAdmin> {
  const admin = await getCurrentPlatformAdmin();
  if (!admin) {
    redirect("/platform-admin/login");
  }
  return admin;
}
