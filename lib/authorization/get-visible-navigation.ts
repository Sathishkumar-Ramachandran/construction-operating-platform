import { NAVIGATION } from "@/lib/authorization/navigation";
import { hasPermission, hasRole } from "@/lib/services/authorization-service";
import { UserRole } from "@/lib/authorization/roles";
import type { AuthenticatedUser } from "@/types/auth";
import type { PermissionCode } from "@/lib/authorization/permissions";

/**
 * Returns the set of navigation `href`s `user` may see. Deliberately
 * returns plain strings (not the NAVIGATION objects, which hold Lucide icon
 * component references) — Server Components cannot pass component/function
 * references as props into Client Components. The navigation config itself
 * is a plain client-safe module and is re-imported directly by the Client
 * Components that render it (NavList), filtered against this set.
 */
export async function getVisibleNavigationHrefs(
  user: AuthenticatedUser
): Promise<string[]> {
  if (user.role === UserRole.SUPER_ADMIN) {
    return NAVIGATION.flatMap((group) => group.items.map((item) => item.href));
  }

  const hrefs: string[] = [];

  for (const group of NAVIGATION) {
    for (const item of group.items) {
      const visible = await isItemVisible(user, item.permissions, item.roles);
      if (visible) hrefs.push(item.href);
    }
  }

  return hrefs;
}

async function isItemVisible(
  user: AuthenticatedUser,
  permissions?: string[],
  roles?: UserRole[]
): Promise<boolean> {
  if (!permissions && !roles) return true;

  if (permissions) {
    for (const code of permissions) {
      if (await hasPermission(user, code as PermissionCode)) return true;
    }
  }

  if (roles && (await hasRole(user, roles))) return true;

  return false;
}
