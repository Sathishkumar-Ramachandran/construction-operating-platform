import { rawDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  generatePlatformAdminSessionToken,
  hashPlatformAdminSessionToken,
  PLATFORM_ADMIN_SESSION_DURATION_MS,
} from "@/lib/auth/platform-admin-token";
import type { AuthenticatedPlatformAdmin } from "@/types/platform-admin-auth";
import type { Prisma } from "@/generated/prisma/client";

type PlatformAdminRow = Prisma.PlatformAdminGetPayload<Record<string, never>>;

function toAuthenticatedPlatformAdmin(admin: PlatformAdminRow): AuthenticatedPlatformAdmin {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    isActive: admin.isActive,
  };
}

// Fixed dummy hash so an unknown-email login takes roughly the same time as
// a real one — same technique as auth-service.ts's authenticateUser.
const DUMMY_HASH =
  "$2a$12$CwTycUXWue0Thq9StjUM0uJ8tG.gL3v2wLReO/vy8QsmwFRPnJd6O";

export type AuthenticatePlatformAdminOutcome =
  | { ok: true; admin: AuthenticatedPlatformAdmin }
  | { ok: false };

/** PlatformAdmin is one of the models the tenant-scoping extension never
 * touches (see lib/db.ts's UNSCOPED_MODELS) — email is genuinely globally
 * unique here, so this is a plain findUnique, not the findMany-by-email
 * dance auth-service.ts's authenticateUser needs for per-company Users. */
export async function authenticatePlatformAdmin(
  email: string,
  password: string
): Promise<AuthenticatePlatformAdminOutcome> {
  const normalizedEmail = email.trim().toLowerCase();
  const admin = await rawDb.platformAdmin.findUnique({ where: { email: normalizedEmail } });

  if (!admin || !admin.isActive) {
    await verifyPassword(password, DUMMY_HASH);
    return { ok: false };
  }

  const validPassword = await verifyPassword(password, admin.passwordHash);
  if (!validPassword) return { ok: false };

  return { ok: true, admin: toAuthenticatedPlatformAdmin(admin) };
}

export type CreatedPlatformAdminSession = {
  token: string;
  expiresAt: Date;
};

export async function createPlatformAdminSession(
  platformAdminId: string
): Promise<CreatedPlatformAdminSession> {
  const token = generatePlatformAdminSessionToken();
  const tokenHash = hashPlatformAdminSessionToken(token);
  const expiresAt = new Date(Date.now() + PLATFORM_ADMIN_SESSION_DURATION_MS);

  await rawDb.platformAdminSession.create({
    data: { platformAdminId, tokenHash, expiresAt },
  });

  return { token, expiresAt };
}

export async function destroyPlatformAdminSessionByToken(rawToken: string): Promise<void> {
  const tokenHash = hashPlatformAdminSessionToken(rawToken);
  await rawDb.platformAdminSession.deleteMany({ where: { tokenHash } });
}

export async function getPlatformAdminSessionUser(
  rawToken: string
): Promise<AuthenticatedPlatformAdmin | null> {
  const tokenHash = hashPlatformAdminSessionToken(rawToken);

  const session = await rawDb.platformAdminSession.findUnique({
    where: { tokenHash },
    include: { platformAdmin: true },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await rawDb.platformAdminSession.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (!session.platformAdmin.isActive) return null;

  return toAuthenticatedPlatformAdmin(session.platformAdmin);
}

export async function recordPlatformAdminLastLogin(platformAdminId: string): Promise<void> {
  await rawDb.platformAdmin.update({
    where: { id: platformAdminId },
    data: { lastLoginAt: new Date() },
  });
}

export async function changeOwnPlatformAdminPassword(
  platformAdminId: string,
  newPassword: string
): Promise<void> {
  const passwordHash = await hashPassword(newPassword);
  await rawDb.platformAdmin.update({
    where: { id: platformAdminId },
    data: { passwordHash },
  });
}
