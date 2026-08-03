import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db, withTenant } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import {
  authenticateUser,
  createSession,
  getSessionUser,
  destroySessionByToken,
} from "@/lib/services/auth-service";
import { UserRole } from "@/lib/authorization/roles";
import { getTestCompanyId } from "@/tests/helpers/actors";

const RUN_ID = randomUUID();
const ACTIVE_EMAIL = `vitest-auth-active-${RUN_ID}@test.excell.internal`;
const INACTIVE_EMAIL = `vitest-auth-inactive-${RUN_ID}@test.excell.internal`;
const PASSWORD = "Str0ng!TestPassw0rd";

let activeUserId: string;
let inactiveUserId: string;

describe("auth-service (integration)", () => {
  beforeAll(async () => {
    const companyId = await getTestCompanyId();
    await withTenant(companyId, async () => {
      const role = await db.role.findUniqueOrThrow({
        where: { companyId_code: { companyId, code: UserRole.TEAM_MEMBER } },
      });
      const passwordHash = await hashPassword(PASSWORD);

      const activeUser = await db.user.create({
        data: {
          name: "Vitest Active User",
          email: ACTIVE_EMAIL,
          passwordHash,
          roleId: role.id,
          isActive: true,
        },
      });
      activeUserId = activeUser.id;

      const inactiveUser = await db.user.create({
        data: {
          name: "Vitest Inactive User",
          email: INACTIVE_EMAIL,
          passwordHash,
          roleId: role.id,
          isActive: false,
        },
      });
      inactiveUserId = inactiveUser.id;
    });
  });

  afterAll(async () => {
    const companyId = await getTestCompanyId();
    await withTenant(companyId, async () => {
      await db.session.deleteMany({
        where: { userId: { in: [activeUserId, inactiveUserId] } },
      });
      await db.user.deleteMany({
        where: { id: { in: [activeUserId, inactiveUserId] } },
      });
    });
  });

  it("authenticates a valid active user and returns a safe user object", async () => {
    const outcome = await authenticateUser(ACTIVE_EMAIL, PASSWORD);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.user.email).toBe(ACTIVE_EMAIL);
      expect(outcome.user.role).toBe(UserRole.TEAM_MEMBER);
      expect(outcome.user).not.toHaveProperty("passwordHash");
    }
  });

  it("rejects an incorrect password with a generic reason", async () => {
    const outcome = await authenticateUser(ACTIVE_EMAIL, "wrong-password");
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.auditCode).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("rejects an inactive user even with the correct password", async () => {
    const outcome = await authenticateUser(INACTIVE_EMAIL, PASSWORD);
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.auditCode).toBe("AUTH_ACCOUNT_INACTIVE");
  });

  it("rejects an unknown email", async () => {
    const outcome = await authenticateUser(
      `no-such-user-${RUN_ID}@test.excell.internal`,
      PASSWORD
    );
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.auditCode).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("normalizes email casing/whitespace on login", async () => {
    const outcome = await authenticateUser(`  ${ACTIVE_EMAIL.toUpperCase()}  `, PASSWORD);
    expect(outcome.ok).toBe(true);
  });

  it("round-trips a session: create, resolve, then destroy", async () => {
    const companyId = await getTestCompanyId();
    const session = await withTenant(companyId, () =>
      createSession(activeUserId, {
        ipAddress: "127.0.0.1",
        userAgent: "vitest",
      })
    );

    const resolved = await getSessionUser(session.token);
    expect(resolved?.id).toBe(activeUserId);

    await destroySessionByToken(session.token);
    const afterDestroy = await getSessionUser(session.token);
    expect(afterDestroy).toBeNull();
  });
});
