import { randomBytes, createHash } from "node:crypto";
import { db, rawDb, withTenant, type Db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { hashSessionToken } from "@/lib/auth/token";
import { env } from "@/lib/env";
import { AppError, ErrorCode } from "@/lib/errors";
import { UserRole } from "@/lib/authorization/roles";
import { assertCanResetPassword } from "@/lib/services/authorization-service";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import {
  generateSecureInitialPasswordFor,
} from "@/lib/services/password-generation-service";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

/** Revokes every session for a user — used on admin reset and offboarding. */
export async function revokeAllSessions(
  userId: string,
  client: Db = db
): Promise<number> {
  const result = await client.session.deleteMany({ where: { userId } });
  return result.count;
}

/** Revokes every session for a user except the one currently in use. */
export async function revokeOtherSessions(
  userId: string,
  currentRawToken: string
): Promise<number> {
  const currentHash = hashSessionToken(currentRawToken);
  const result = await db.session.deleteMany({
    where: { userId, tokenHash: { not: currentHash } },
  });
  return result.count;
}

export type AdminResetResult = {
  temporaryPassword: string;
  userId: string;
};

/**
 * Administrator-initiated password reset. Generates a new temporary
 * password server-side, forces a change on next login, revokes every
 * existing session for the target user, and audits the action (reason
 * included, password never included).
 */
export async function adminResetPassword(
  actor: AuthenticatedUser,
  targetUserId: string,
  reason: string,
  meta: ActorMeta = {}
): Promise<AdminResetResult> {
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, email: true, role: { select: { code: true } } },
  });
  if (!target) throw new AppError(ErrorCode.USER_NOT_FOUND);

  assertCanResetPassword(
    actor.id,
    actor.role,
    target.id,
    target.role.code as UserRole
  );

  const temporaryPassword = generateSecureInitialPasswordFor([
    target.name,
    target.email,
  ]);
  const passwordHash = await hashPassword(temporaryPassword);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: {
        passwordHash,
        mustChangePassword: true,
        updatedBy: actor.id,
        version: { increment: 1 },
      },
    });

    const revokedCount = await revokeAllSessions(target.id, tx);

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.USER_PASSWORD_RESET_BY_ADMIN,
      entityType: "User",
      entityId: target.id,
      metadata: { reason, sessionsRevoked: revokedCount },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });

  return { temporaryPassword, userId: target.id };
}

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Domain model for the forgot-password flow. No public UI route is wired up
 * yet — no email provider is configured in this environment — but the
 * service is fully implemented and unit tested so a /login/forgot-password
 * page + email delivery can be added later without touching this logic.
 */
export async function requestForgotPasswordToken(
  email: string
): Promise<{ token: string; userId: string } | null> {
  // Uses rawDb, like login — no companyId is known yet from an email alone
  // (email is only unique per-company). If the same email exists under
  // multiple companies, this arbitrarily picks the first active match; a
  // company-picker for that rare case is a later follow-up, same as login.
  const user = await rawDb.user.findFirst({
    where: { email: email.trim().toLowerCase(), isActive: true },
    select: { id: true, isActive: true, companyId: true },
  });
  if (!user) return null;

  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256")
    .update(env.AUTH_SECRET)
    .update(token)
    .digest("hex");

  await withTenant(user.companyId, () =>
    db.$transaction(async (tx) => {
      // A newer token always revokes older ones for the same user.
      await tx.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      await recordAuditLog(tx, {
        userId: user.id,
        action: AuditAction.USER_PASSWORD_RESET_REQUESTED,
        entityType: "User",
        entityId: user.id,
      });
    })
  );

  return { token, userId: user.id };
}

export async function consumeForgotPasswordToken(
  rawToken: string,
  newPassword: string
): Promise<void> {
  const tokenHash = createHash("sha256")
    .update(env.AUTH_SECRET)
    .update(rawToken)
    .digest("hex");

  // rawDb: like requestForgotPasswordToken, no companyId is known yet at
  // this point — the token itself is what resolves it.
  const record = await rawDb.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (
    !record ||
    !record.companyId ||
    record.usedAt !== null ||
    record.expiresAt.getTime() < Date.now()
  ) {
    throw new AppError(ErrorCode.RESET_TOKEN_INVALID);
  }
  const companyId = record.companyId;

  const passwordHash = await hashPassword(newPassword);

  await withTenant(companyId, () =>
    db.$transaction(async (tx) => {
      await tx.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });

      await tx.user.update({
        where: { id: record.userId },
        data: { passwordHash, mustChangePassword: false, version: { increment: 1 } },
      });

      await revokeAllSessions(record.userId, tx);

      await recordAuditLog(tx, {
        userId: record.userId,
        action: AuditAction.USER_PASSWORD_RESET_COMPLETED,
        entityType: "User",
        entityId: record.userId,
      });
    })
  );
}
