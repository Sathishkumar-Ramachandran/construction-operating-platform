import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/authorization/roles";
import { ErrorCode } from "@/lib/errors";
import { verifyPassword } from "@/lib/auth/password";
import { createUser } from "@/lib/services/user-service";
import { adminResetPassword } from "@/lib/services/password-reset-service";
import { changeOwnPasswordVerified } from "@/lib/services/auth-service";
import { generateSessionToken, hashSessionToken } from "@/lib/auth/token";
import { createActor, trackedEmail, cleanupUserIds } from "@/tests/helpers/actors";
import { createEmployee } from "@/lib/services/employee-service";
import {
  buildCreateEmployeeInput,
  createdEmployeeIds,
  cleanupHrFixtures,
} from "@/tests/helpers/hr-fixtures";

const createdUserIds: string[] = [];

describe("password generation / admin reset / self-service change (integration)", () => {
  afterAll(async () => {
    await cleanupHrFixtures();
    await cleanupUserIds(createdUserIds);
  });

  it("creating a user returns the temporary password once and forces a change on next login", async () => {
    const hrActor = await createActor(UserRole.HR, "hr-create-user");
    createdUserIds.push(hrActor.id);

    const result = await createUser(hrActor, {
      name: "Vitest Password Flow User",
      email: trackedEmail("password-flow-user"),
      roleCode: UserRole.TEAM_MEMBER,
    });
    createdUserIds.push(result.user.id);

    expect(result.temporaryPassword).toBeTruthy();
    expect(result.user.mustChangePassword).toBe(true);

    const stored = await db.user.findUniqueOrThrow({ where: { id: result.user.id } });
    const matches = await verifyPassword(result.temporaryPassword, stored.passwordHash);
    expect(matches).toBe(true);
  });

  it("links a newly created user to an employee record", async () => {
    const hrActor = await createActor(UserRole.HR, "hr-create-linked-user");
    createdUserIds.push(hrActor.id);

    const employee = await createEmployee(hrActor, await buildCreateEmployeeInput());
    createdEmployeeIds.push(employee.id);

    const result = await createUser(hrActor, {
      name: "Vitest Linked User",
      email: trackedEmail("linked-user"),
      roleCode: UserRole.TEAM_MEMBER,
      employeeId: employee.id,
    });
    createdUserIds.push(result.user.id);

    const updatedEmployee = await db.employee.findUniqueOrThrow({ where: { id: employee.id } });
    expect(updatedEmployee.userId).toBe(result.user.id);
  });

  it("rejects linking a user to an employee that already has one", async () => {
    const hrActor = await createActor(UserRole.HR, "hr-double-link");
    createdUserIds.push(hrActor.id);

    const employee = await createEmployee(hrActor, await buildCreateEmployeeInput());
    createdEmployeeIds.push(employee.id);

    const first = await createUser(hrActor, {
      name: "Vitest First Link",
      email: trackedEmail("first-link"),
      roleCode: UserRole.TEAM_MEMBER,
      employeeId: employee.id,
    });
    createdUserIds.push(first.user.id);

    await expect(
      createUser(hrActor, {
        name: "Vitest Second Link",
        email: trackedEmail("second-link"),
        roleCode: UserRole.TEAM_MEMBER,
        employeeId: employee.id,
      })
    ).rejects.toMatchObject({ code: ErrorCode.EMPLOYEE_ALREADY_LINKED_TO_USER });
  });

  it("admin reset generates a new password, forces a change, and revokes every session", async () => {
    const adminActor = await createActor(UserRole.ADMIN, "admin-resetter");
    createdUserIds.push(adminActor.id);

    const target = await createUser(adminActor, {
      name: "Vitest Reset Target",
      email: trackedEmail("reset-target"),
      roleCode: UserRole.TEAM_MEMBER,
    });
    createdUserIds.push(target.user.id);

    await db.session.createMany({
      data: [
        { userId: target.user.id, tokenHash: hashSessionToken(generateSessionToken()), expiresAt: new Date(Date.now() + 60_000) },
        { userId: target.user.id, tokenHash: hashSessionToken(generateSessionToken()), expiresAt: new Date(Date.now() + 60_000) },
      ],
    });

    const result = await adminResetPassword(adminActor, target.user.id, "User forgot their password");
    expect(result.temporaryPassword).not.toBe(target.temporaryPassword);

    const stored = await db.user.findUniqueOrThrow({ where: { id: target.user.id } });
    expect(stored.mustChangePassword).toBe(true);
    expect(await verifyPassword(result.temporaryPassword, stored.passwordHash)).toBe(true);

    const remainingSessions = await db.session.count({ where: { userId: target.user.id } });
    expect(remainingSessions).toBe(0);
  });

  it("an ADMIN cannot reset a SUPER_ADMIN's password", async () => {
    const adminActor = await createActor(UserRole.ADMIN, "admin-cannot-reset-sa");
    createdUserIds.push(adminActor.id);
    const superAdminActor = await createActor(UserRole.SUPER_ADMIN, "sa-reset-target");
    createdUserIds.push(superAdminActor.id);

    await expect(
      adminResetPassword(adminActor, superAdminActor.id, "Attempted reset")
    ).rejects.toMatchObject({ code: ErrorCode.USER_CANNOT_MODIFY_SUPER_ADMIN });
  });

  it("no one can reset their own password through the administrative flow", async () => {
    const adminActor = await createActor(UserRole.ADMIN, "admin-self-reset");
    createdUserIds.push(adminActor.id);

    await expect(
      adminResetPassword(adminActor, adminActor.id, "Trying to self-reset")
    ).rejects.toMatchObject({ code: ErrorCode.USER_CANNOT_RESET_OWN_PASSWORD });
  });

  it("self-service password change rejects a wrong current password", async () => {
    const actor = await createActor(UserRole.TEAM_MEMBER, "security-wrong-current");
    createdUserIds.push(actor.id);
    const token = generateSessionToken();
    await db.session.create({
      data: { userId: actor.id, tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + 60_000) },
    });

    await expect(
      changeOwnPasswordVerified(actor.id, "definitely-wrong", "NewStr0ng!Passw0rd", token)
    ).rejects.toMatchObject({ code: ErrorCode.AUTH_INVALID_CREDENTIALS });
  });

  it("self-service password change revokes other sessions but keeps the current one", async () => {
    const actor = await createActor(UserRole.TEAM_MEMBER, "security-revoke-others");
    createdUserIds.push(actor.id);

    const currentToken = generateSessionToken();
    const otherToken = generateSessionToken();
    await db.session.createMany({
      data: [
        { userId: actor.id, tokenHash: hashSessionToken(currentToken), expiresAt: new Date(Date.now() + 60_000) },
        { userId: actor.id, tokenHash: hashSessionToken(otherToken), expiresAt: new Date(Date.now() + 60_000) },
      ],
    });

    const result = await changeOwnPasswordVerified(
      actor.id,
      "Str0ng!TestPassw0rd", // matches createActor's fixed test password
      "BrandNewStr0ng!Passw0rd",
      currentToken
    );
    expect(result.sessionsRevoked).toBe(1);

    const remaining = await db.session.findMany({ where: { userId: actor.id } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0].tokenHash).toBe(hashSessionToken(currentToken));
  });
});
