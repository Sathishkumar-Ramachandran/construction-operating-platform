import { db, rawDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateSessionToken, hashSessionToken, SESSION_DURATION_MS } from "@/lib/auth/token";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { revokeOtherSessions } from "@/lib/services/password-reset-service";
import type { UserRole } from "@/lib/authorization/roles";
import type { AuthenticatedUser } from "@/types/auth";
import type { Prisma } from "@/generated/prisma/client";

type UserWithRole = Prisma.UserGetPayload<{ include: { role: true } }>;

export function toAuthenticatedUser(user: UserWithRole): AuthenticatedUser {
  return {
    id: user.id,
    companyId: user.companyId as string,
    name: user.name,
    email: user.email,
    role: user.role.code as UserRole,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}

// Fixed dummy hash so an unknown-email login takes roughly the same time as
// a real one — avoids leaking account existence via response timing.
const DUMMY_HASH =
  "$2a$12$CwTycUXWue0Thq9StjUM0uJ8tG.gL3v2wLReO/vy8QsmwFRPnJd6O";

export type AuthenticateOutcome =
  | { ok: true; user: AuthenticatedUser }
  | { ok: false; auditCode: "AUTH_INVALID_CREDENTIALS" | "AUTH_ACCOUNT_INACTIVE" };

/**
 * Verifies credentials. Always throws the same generic AppError on failure
 * so the caller cannot distinguish "no such user" from "wrong password" from
 * the thrown error alone — the distinct internal reason is only returned via
 * `AuthenticateOutcome` for audit-logging purposes when called via
 * `authenticateUserForAudit`.
 */
/**
 * Email is no longer globally unique once multiple companies exist (it's
 * only unique per-company), so this looks up every matching User via
 * `rawDb` (no companyId is known yet — that's the whole point) and checks
 * the password against each candidate. In the overwhelming common case
 * there's zero or one match; if the same email was independently
 * provisioned under two companies, the first one with a valid password
 * wins (a company-picker prompt for that rare case is a later follow-up,
 * not built here).
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthenticateOutcome> {
  const normalizedEmail = email.trim().toLowerCase();

  const candidates = await rawDb.user.findMany({
    where: { email: normalizedEmail },
    include: { role: true, company: true },
  });

  if (candidates.length === 0) {
    await verifyPassword(password, DUMMY_HASH);
    return { ok: false, auditCode: "AUTH_INVALID_CREDENTIALS" };
  }

  for (const user of candidates) {
    if (!user.isActive || !user.company?.isActive) continue;
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (validPassword) {
      return { ok: true, user: toAuthenticatedUser(user) };
    }
  }

  // No active candidate had a matching password — still run one dummy
  // verification so the response time doesn't leak which branch we took.
  await verifyPassword(password, DUMMY_HASH);

  const anyActiveAccount = candidates.some((u) => u.isActive && u.company?.isActive);
  return {
    ok: false,
    auditCode: anyActiveAccount ? "AUTH_INVALID_CREDENTIALS" : "AUTH_ACCOUNT_INACTIVE",
  };
}

export type CreatedSession = {
  token: string;
  expiresAt: Date;
};

export async function createSession(
  userId: string,
  meta: { ipAddress?: string | null; userAgent?: string | null }
): Promise<CreatedSession> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    },
  });

  return { token, expiresAt };
}

/** Uses `rawDb`, like getSessionUser — a logout can be called with a stale
 * or cross-tenant-ambiguous token and must still be able to clear it
 * without first needing to resolve a companyId. */
export async function destroySessionByToken(rawToken: string): Promise<void> {
  const tokenHash = hashSessionToken(rawToken);
  await rawDb.session.deleteMany({ where: { tokenHash } });
}

/**
 * Resolves a raw session-cookie token to the current user, or null. Uses
 * `rawDb` — no companyId is known yet at this point in the request, this
 * IS how it gets resolved. Re-checks `company.isActive` on every call (not
 * just at login) so deactivating a company invalidates its users' already
 * -live sessions immediately, not just at next login.
 */
export async function getSessionUser(
  rawToken: string
): Promise<AuthenticatedUser | null> {
  const tokenHash = hashSessionToken(rawToken);

  const session = await rawDb.session.findUnique({
    where: { tokenHash },
    include: { user: { include: { role: true, company: true } } },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await rawDb.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (!session.user.isActive || !session.user.company?.isActive) return null;

  return toAuthenticatedUser(session.user);
}

export async function recordLastLogin(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

export async function changeOwnPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false, version: { increment: 1 } },
  });
}

/**
 * Self-service password change from /profile/security — verifies the
 * current password, rejects re-using it, and revokes every other session
 * (keeping the caller's own session alive).
 */
export async function changeOwnPasswordVerified(
  userId: string,
  currentPassword: string,
  newPassword: string,
  currentRawSessionToken: string
): Promise<{ sessionsRevoked: number }> {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { passwordHash: true },
  });

  const currentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentValid) {
    throw new AppError(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      "Current password is incorrect."
    );
  }

  const sameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      "New password must be different from your current password."
    );
  }

  await changeOwnPassword(userId, newPassword);
  const sessionsRevoked = await revokeOtherSessions(userId, currentRawSessionToken);

  await recordAuditLog(db, {
    userId,
    action: AuditAction.USER_PASSWORD_CHANGED,
    entityType: "User",
    entityId: userId,
    metadata: { sessionsRevoked },
  });

  return { sessionsRevoked };
}
