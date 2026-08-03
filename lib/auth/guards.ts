import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasPermission, hasRole } from "@/lib/services/authorization-service";
import { withTenant } from "@/lib/db";
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

/**
 * `withTenant*` wrappers — the actual entry points every tenant-scoped
 * page/action/route must call instead of the plain `require*` guards above.
 *
 * `AsyncLocalStorage.run()` only covers work started *inside* its callback,
 * so `fn` must be the entire rest of the handler's body (every `db.*` call
 * it makes, directly or transitively), not just a check performed before
 * returning to the caller. Call shape:
 *
 *   export async function ProjectsPage() {
 *     return withTenantPermission(PERMISSIONS.PROJECTS_VIEW.code, async (user) => {
 *       const projects = await listProjects(user);
 *       return <ProjectsView projects={projects} />;
 *     });
 *   }
 */
export async function withTenantUser<T>(
  fn: (user: AuthenticatedUser) => Promise<T>
): Promise<T> {
  const user = await requireUser();
  return withTenant(user.companyId, () => fn(user));
}

/**
 * These variants deliberately do NOT reuse requireRole/requirePermission/
 * requireAnyPermission/requireApiPermission — those call hasRole/
 * hasPermission BEFORE any tenant context exists, and hasPermission queries
 * the tenant-scoped `db` for every role except SUPER_ADMIN (which
 * short-circuits without touching the database). Calling them here would
 * throw "no companyId in context" for every non-SUPER_ADMIN user. Instead,
 * only the cheap, DB-free user lookup (requireUser/requireApiUser) runs
 * before withTenant(); the permission/role check itself runs inside it.
 */
export async function withTenantRole<T>(
  roles: UserRole[],
  fn: (user: AuthenticatedUser) => Promise<T>
): Promise<T> {
  const user = await requireUser();
  return withTenant(user.companyId, async () => {
    const allowed = await hasRole(user, roles);
    if (!allowed) redirect("/unauthorized");
    return fn(user);
  });
}

export async function withTenantPermission<T>(
  code: PermissionCode,
  fn: (user: AuthenticatedUser) => Promise<T>
): Promise<T> {
  const user = await requireUser();
  return withTenant(user.companyId, async () => {
    const allowed = await hasPermission(user, code);
    if (!allowed) redirect("/unauthorized");
    return fn(user);
  });
}

export async function withTenantAnyPermission<T>(
  codes: PermissionCode[],
  fn: (user: AuthenticatedUser) => Promise<T>
): Promise<T> {
  const user = await requireUser();
  return withTenant(user.companyId, async () => {
    for (const code of codes) {
      if (await hasPermission(user, code)) return fn(user);
    }
    redirect("/unauthorized");
  });
}

/** For Route Handlers — mirrors ApiGuardResult's shape so callers keep their
 * existing `if (result.response) return result.response;` early-return
 * pattern, just wrapped around a tenant context instead of a bare user. */
export async function withTenantApiUser<T>(
  fn: (user: AuthenticatedUser) => Promise<T | Response>
): Promise<T | Response> {
  const result = await requireApiUser();
  if (result.response) return result.response;
  return withTenant(result.user.companyId, () => fn(result.user));
}

export async function withTenantApiPermission<T>(
  code: PermissionCode,
  fn: (user: AuthenticatedUser) => Promise<T | Response>
): Promise<T | Response> {
  const result = await requireApiUser();
  if (result.response) return result.response;
  return withTenant(result.user.companyId, async () => {
    const allowed = await hasPermission(result.user, code);
    if (!allowed) return forbiddenResponse();
    return fn(result.user);
  });
}
