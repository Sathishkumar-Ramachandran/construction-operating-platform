import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { AppError, ErrorCode } from "@/lib/errors";
import { UserRole } from "@/lib/authorization/roles";
import {
  assertCanCreateUser,
  assertCanModifyUser,
  assertCanAssignRole,
  assertCanSetUserActive,
} from "@/lib/services/authorization-service";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { generateSecureInitialPasswordFor } from "@/lib/services/password-generation-service";
import type {
  CreateUserInput,
  UpdateUserInput,
  AssignRoleInput,
  SetUserActiveInput,
  ListUsersQuery,
} from "@/lib/validation/users";
import type { AuthenticatedUser } from "@/types/auth";
import type { Prisma } from "@/generated/prisma/client";

type ActorMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  mustChangePassword: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  role: { select: { id: true, code: true, name: true } },
} satisfies Prisma.UserSelect;

async function getRoleByCode(code: string) {
  const role = await db.role.findUnique({ where: { code } });
  if (!role) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Unknown role.");
  }
  return role;
}

async function countActiveSuperAdmins(
  client: typeof db | Prisma.TransactionClient = db
) {
  return client.user.count({
    where: { isActive: true, role: { code: UserRole.SUPER_ADMIN } },
  });
}

export async function listUsers(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.roleCode ? { role: { code: query.roleCode } } : {}),
    ...(query.status === "active" ? { isActive: true } : {}),
    ...(query.status === "inactive" ? { isActive: false } : {}),
  };

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select: SAFE_USER_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { users, total, page: query.page, pageSize: query.pageSize };
}

export async function createUser(
  actor: AuthenticatedUser,
  input: CreateUserInput,
  meta: ActorMeta = {}
) {
  assertCanCreateUser(actor.role, input.roleCode as UserRole);

  const normalizedEmail = input.email.trim().toLowerCase();

  const existing = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    throw new AppError(ErrorCode.USER_EMAIL_ALREADY_EXISTS);
  }

  let employee: { id: string; userId: string | null; firstName: string; lastName: string | null; dateOfBirth: Date | null } | null = null;
  if (input.employeeId) {
    employee = await db.employee.findUnique({
      where: { id: input.employeeId },
      select: { id: true, userId: true, firstName: true, lastName: true, dateOfBirth: true },
    });
    if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);
    if (employee.userId) throw new AppError(ErrorCode.EMPLOYEE_ALREADY_LINKED_TO_USER);
  }

  const role = await getRoleByCode(input.roleCode);
  const temporaryPassword = generateSecureInitialPasswordFor([
    input.name,
    normalizedEmail,
    employee?.firstName,
    employee?.lastName,
    employee?.dateOfBirth?.toISOString().slice(0, 10),
  ]);
  const passwordHash = await hashPassword(temporaryPassword);

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        roleId: role.id,
        mustChangePassword: true,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
      select: SAFE_USER_SELECT,
    });

    if (employee) {
      await tx.employee.update({
        where: { id: employee.id },
        data: { userId: created.id, updatedBy: actor.id, version: { increment: 1 } },
      });
      await recordAuditLog(tx, {
        userId: actor.id,
        action: AuditAction.EMPLOYEE_USER_LINKED,
        entityType: "Employee",
        entityId: employee.id,
        afterData: { userId: created.id },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.USER_CREATED,
      entityType: "User",
      entityId: created.id,
      afterData: { name: created.name, email: created.email, role: role.code },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.USER_INITIAL_PASSWORD_GENERATED,
      entityType: "User",
      entityId: created.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return created;
  });

  return { user, temporaryPassword };
}

export async function updateUser(
  actor: AuthenticatedUser,
  input: UpdateUserInput,
  meta: ActorMeta = {}
) {
  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, version: true, role: { select: { code: true } } },
  });
  if (!target) throw new AppError(ErrorCode.USER_NOT_FOUND);

  assertCanModifyUser(actor.role, target.role.code as UserRole);

  const updated = await db.$transaction(async (tx) => {
    // updateMany (rather than update) lets the where-clause include the
    // non-unique `version` field, giving us optimistic-concurrency control:
    // if another request changed the row first, count is 0.
    const result = await tx.user.updateMany({
      where: { id: input.userId, version: target.version },
      data: {
        name: input.name.trim(),
        updatedBy: actor.id,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new AppError(
        ErrorCode.CONFLICT_ERROR,
        "This user was changed by someone else. Refresh and try again."
      );
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: SAFE_USER_SELECT,
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.USER_UPDATED,
      entityType: "User",
      entityId: user.id,
      beforeData: { name: target.name },
      afterData: { name: user.name },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return user;
  });

  return updated;
}

export async function assignRole(
  actor: AuthenticatedUser,
  input: AssignRoleInput,
  meta: ActorMeta = {}
) {
  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, isActive: true, role: { select: { code: true } } },
  });
  if (!target) throw new AppError(ErrorCode.USER_NOT_FOUND);

  const currentRole = target.role.code as UserRole;
  const nextRole = input.roleCode as UserRole;

  assertCanAssignRole(actor.role, currentRole, nextRole);

  if (
    currentRole === UserRole.SUPER_ADMIN &&
    nextRole !== UserRole.SUPER_ADMIN &&
    target.isActive
  ) {
    const activeSuperAdmins = await countActiveSuperAdmins();
    if (activeSuperAdmins <= 1) {
      throw new AppError(ErrorCode.USER_LAST_SUPER_ADMIN_REQUIRED);
    }
  }

  const role = await getRoleByCode(input.roleCode);

  const updated = await db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: input.userId },
      data: { roleId: role.id, updatedBy: actor.id, version: { increment: 1 } },
      select: SAFE_USER_SELECT,
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.USER_ROLE_CHANGED,
      entityType: "User",
      entityId: user.id,
      beforeData: { role: currentRole },
      afterData: { role: nextRole },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return user;
  });

  return updated;
}

export async function setUserActive(
  actor: AuthenticatedUser,
  input: SetUserActiveInput,
  meta: ActorMeta = {}
) {
  const target = await db.user.findUnique({
    where: { id: input.userId },
    select: { id: true, isActive: true, role: { select: { code: true } } },
  });
  if (!target) throw new AppError(ErrorCode.USER_NOT_FOUND);

  const targetRole = target.role.code as UserRole;
  const activeSuperAdminCount =
    targetRole === UserRole.SUPER_ADMIN
      ? await countActiveSuperAdmins()
      : 0;

  assertCanSetUserActive({
    actorId: actor.id,
    actorRole: actor.role,
    targetId: target.id,
    targetRole,
    targetIsActive: target.isActive,
    nextIsActive: input.isActive,
    activeSuperAdminCount,
  });

  const updated = await db.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: input.userId },
      data: {
        isActive: input.isActive,
        updatedBy: actor.id,
        version: { increment: 1 },
      },
      select: SAFE_USER_SELECT,
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: input.isActive
        ? AuditAction.USER_ACTIVATED
        : AuditAction.USER_DEACTIVATED,
      entityType: "User",
      entityId: user.id,
      beforeData: { isActive: target.isActive },
      afterData: { isActive: user.isActive },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return user;
  });

  return updated;
}
