import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasPermission, hasRole } from "@/lib/services/authorization-service";
import type { UserRole } from "@/lib/authorization/roles";
import type { PermissionCode } from "@/lib/authorization/permissions";
import type { AuthenticatedUser } from "@/types/auth";

/**
 * For Server Components / Server Actions. Redirects (rather than throwing)
 * on failure — this IS the security boundary; proxy.ts only does an
 * optimistic pre-check and must never be relied on alone.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(
  roles: UserRole[]
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  const allowed = await hasRole(user, roles);
  if (!allowed) {
    redirect("/unauthorized");
  }
  return user;
}

export async function requirePermission(
  code: PermissionCode
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  const allowed = await hasPermission(user, code);
  if (!allowed) {
    redirect("/unauthorized");
  }
  return user;
}

/** Like requirePermission, but passes if the actor holds ANY of the given
 * codes — for actions two different modules can both authorize (e.g. a
 * project's Team Management reusing the HR allocation engine) without
 * granting the broader of the two permissions to callers who only need
 * the narrower one. */
export async function requireAnyPermission(
  codes: PermissionCode[]
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  for (const code of codes) {
    if (await hasPermission(user, code)) return user;
  }
  redirect("/unauthorized");
}

export type ApiGuardResult =
  | { user: AuthenticatedUser; response?: never }
  | { user?: never; response: Response };

function unauthorizedResponse() {
  return Response.json(
    { error: "AUTH_SESSION_REQUIRED", message: "You must be signed in." },
    { status: 401 }
  );
}

function forbiddenResponse() {
  return Response.json(
    {
      error: "AUTH_PERMISSION_DENIED",
      message: "You do not have permission to do that.",
    },
    { status: 403 }
  );
}

/** For Route Handlers — returns a Response instead of redirecting. */
export async function requireApiUser(): Promise<ApiGuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { response: unauthorizedResponse() };
  }
  return { user };
}

export async function requireApiPermission(
  code: PermissionCode
): Promise<ApiGuardResult> {
  const result = await requireApiUser();
  if (result.response) return result;

  const allowed = await hasPermission(result.user, code);
  if (!allowed) {
    return { response: forbiddenResponse() };
  }
  return { user: result.user };
}
