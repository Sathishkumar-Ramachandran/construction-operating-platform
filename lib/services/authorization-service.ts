import { db } from "@/lib/db";
import { UserRole } from "@/lib/authorization/roles";
import type { PermissionCode } from "@/lib/authorization/permissions";
import { AppError, ErrorCode } from "@/lib/errors";
import type { AuthenticatedUser } from "@/types/auth";

/**
 * Central permission check. The Super Admin bypass is evaluated first and
 * unconditionally — a Super Admin is always authorized, regardless of the
 * RolePermission table. This must run on the server; never trust a
 * client-supplied role.
 */
export async function hasPermission(
  user: Pick<AuthenticatedUser, "role" | "isActive">,
  code: PermissionCode
): Promise<boolean> {
  if (!user.isActive) return false;
  if (user.role === UserRole.SUPER_ADMIN) return true;

  const match = await db.rolePermission.findFirst({
    where: {
      allowed: true,
      role: { code: user.role, isActive: true },
      permission: { code },
    },
    select: { id: true },
  });

  return match !== null;
}

export async function hasRole(
  user: Pick<AuthenticatedUser, "role" | "isActive">,
  roles: UserRole[]
): Promise<boolean> {
  if (!user.isActive) return false;
  if (user.role === UserRole.SUPER_ADMIN) return true;
  return roles.includes(user.role);
}

/** ADMIN may never create a SUPER_ADMIN account. */
export function assertCanCreateUser(actorRole: UserRole, targetRole: UserRole) {
  if (targetRole === UserRole.SUPER_ADMIN && actorRole !== UserRole.SUPER_ADMIN) {
    throw new AppError(ErrorCode.USER_CANNOT_ASSIGN_SUPER_ADMIN);
  }
}

/** ADMIN may never edit an existing SUPER_ADMIN account. */
export function assertCanModifyUser(actorRole: UserRole, targetRole: UserRole) {
  if (targetRole === UserRole.SUPER_ADMIN && actorRole !== UserRole.SUPER_ADMIN) {
    throw new AppError(ErrorCode.USER_CANNOT_MODIFY_SUPER_ADMIN);
  }
}

/**
 * ADMIN may never promote a user to SUPER_ADMIN, nor change the role of an
 * existing SUPER_ADMIN.
 */
export function assertCanAssignRole(
  actorRole: UserRole,
  targetCurrentRole: UserRole,
  newRole: UserRole
) {
  if (
    targetCurrentRole === UserRole.SUPER_ADMIN &&
    actorRole !== UserRole.SUPER_ADMIN
  ) {
    throw new AppError(ErrorCode.USER_CANNOT_MODIFY_SUPER_ADMIN);
  }
  if (newRole === UserRole.SUPER_ADMIN && actorRole !== UserRole.SUPER_ADMIN) {
    throw new AppError(ErrorCode.USER_CANNOT_ASSIGN_SUPER_ADMIN);
  }
}

export type DeactivationCheck = {
  actorId: string;
  actorRole: UserRole;
  targetId: string;
  targetRole: UserRole;
  targetIsActive: boolean;
  nextIsActive: boolean;
  activeSuperAdminCount: number;
};

/**
 * Guards the activate/deactivate transition:
 * - ADMIN can never touch a SUPER_ADMIN's active status.
 * - No one can deactivate themselves.
 * - The last active SUPER_ADMIN can never be deactivated.
 */
export function assertCanSetUserActive(check: DeactivationCheck) {
  const {
    actorId,
    actorRole,
    targetId,
    targetRole,
    targetIsActive,
    nextIsActive,
    activeSuperAdminCount,
  } = check;

  if (targetRole === UserRole.SUPER_ADMIN && actorRole !== UserRole.SUPER_ADMIN) {
    throw new AppError(ErrorCode.USER_CANNOT_MODIFY_SUPER_ADMIN);
  }

  if (nextIsActive) return;

  if (actorId === targetId) {
    throw new AppError(ErrorCode.USER_CANNOT_DEACTIVATE_SELF);
  }

  if (
    targetRole === UserRole.SUPER_ADMIN &&
    targetIsActive &&
    activeSuperAdminCount <= 1
  ) {
    throw new AppError(ErrorCode.USER_LAST_SUPER_ADMIN_REQUIRED);
  }
}

/**
 * Guards the administrative "reset another user's password" action:
 * - ADMIN can never reset a SUPER_ADMIN's password.
 * - No one can reset their own password through this flow (self-service
 *   password change lives at /profile/security instead).
 */
export function assertCanResetPassword(
  actorId: string,
  actorRole: UserRole,
  targetId: string,
  targetRole: UserRole
) {
  if (actorId === targetId) {
    throw new AppError(ErrorCode.USER_CANNOT_RESET_OWN_PASSWORD);
  }
  if (targetRole === UserRole.SUPER_ADMIN && actorRole !== UserRole.SUPER_ADMIN) {
    throw new AppError(ErrorCode.USER_CANNOT_MODIFY_SUPER_ADMIN);
  }
}
