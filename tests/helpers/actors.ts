import { randomUUID } from "node:crypto";
import { db, rawDb, withTenant } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { UserRole } from "@/lib/authorization/roles";
import type { AuthenticatedUser } from "@/types/auth";

export const RUN_ID = randomUUID();
export const TEST_EMAIL_DOMAIN = "test.excell.internal";

export function trackedEmail(label: string) {
  return `vitest-${label}-${RUN_ID}@${TEST_EMAIL_DOMAIN}`;
}

let testCompanyId: string | null = null;

/** Every existing integration test exercises the single seeded
 * "Excell Enterprises" tenant — resolve it once via rawDb (no tenant
 * context exists yet) and reuse its id as the withTenant scope for the
 * rest of the suite's db calls. */
export async function getTestCompanyId(): Promise<string> {
  if (testCompanyId) return testCompanyId;
  const company = await rawDb.company.findFirstOrThrow({ where: { slug: "excell-enterprises" } });
  testCompanyId = company.id;
  return testCompanyId;
}

/**
 * Creates a real User row (never a fabricated object) and returns it as an
 * AuthenticatedUser. Required because AuditLog.userId has a foreign key to
 * User(id), and every service call under test writes an audit log — the
 * caller is responsible for tracking the returned id for cleanup.
 */
export async function createActor(
  roleCode: UserRole,
  label: string
): Promise<AuthenticatedUser> {
  const companyId = await getTestCompanyId();
  return withTenant(companyId, async () => {
    const role = await db.role.findUniqueOrThrow({
      where: { companyId_code: { companyId, code: roleCode } },
    });
    const passwordHash = await hashPassword("Str0ng!TestPassw0rd");
    const user = await db.user.create({
      data: {
        name: `Vitest ${label} Actor`,
        email: trackedEmail(label),
        passwordHash,
        roleId: role.id,
        isActive: true,
      },
    });
    return {
      id: user.id,
      companyId,
      name: user.name,
      email: user.email,
      role: roleCode,
      isActive: true,
      mustChangePassword: false,
    };
  });
}

/** Cleans up rows created by createActor/createUser-style test helpers. */
export async function cleanupUserIds(userIds: string[]) {
  if (userIds.length === 0) return;
  const companyId = await getTestCompanyId();
  await withTenant(companyId, async () => {
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.auditLog.deleteMany({
      where: {
        OR: [{ entityId: { in: userIds } }, { userId: { in: userIds } }],
      },
    });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
  });
}
