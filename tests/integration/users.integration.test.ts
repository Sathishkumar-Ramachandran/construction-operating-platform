import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createUser,
  updateUser,
  assignRole,
  setUserActive,
} from "@/lib/services/user-service";
import { ErrorCode } from "@/lib/errors";
import { UserRole } from "@/lib/authorization/roles";
import { createActor, trackedEmail, cleanupUserIds } from "@/tests/helpers/actors";
import type { AuthenticatedUser } from "@/types/auth";

const createdUserIds: string[] = [];

let adminActor: AuthenticatedUser;

describe("user-service (integration)", () => {
  beforeAll(async () => {
    adminActor = await createActor(UserRole.ADMIN, "admin");
    createdUserIds.push(adminActor.id);
  });

  afterAll(async () => {
    await cleanupUserIds(createdUserIds);
  });

  describe("createUser", () => {
    it("prevents an ADMIN actor from creating a SUPER_ADMIN", async () => {
      await expect(
        createUser(adminActor, {
          name: "Should Fail",
          email: trackedEmail("should-not-exist"),
          roleCode: UserRole.SUPER_ADMIN,
        })
      ).rejects.toMatchObject({ code: ErrorCode.USER_CANNOT_ASSIGN_SUPER_ADMIN });
    });

    it("allows an ADMIN actor to create a MANAGER, generates a password, and forces a change", async () => {
      const result = await createUser(adminActor, {
        name: "Vitest Manager One",
        email: trackedEmail("manager-one"),
        roleCode: UserRole.MANAGER,
      });
      createdUserIds.push(result.user.id);

      expect(result.user.role.code).toBe(UserRole.MANAGER);
      expect(result.user.mustChangePassword).toBe(true);
      expect(result.user).not.toHaveProperty("passwordHash");
      expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(14);
      expect(result.temporaryPassword).toMatch(/[a-z]/);
      expect(result.temporaryPassword).toMatch(/[A-Z]/);
      expect(result.temporaryPassword).toMatch(/[0-9]/);
    });

    it("rejects a duplicate email", async () => {
      const email = trackedEmail("duplicate-target");
      const first = await createUser(adminActor, {
        name: "Vitest Duplicate First",
        email,
        roleCode: UserRole.HR,
      });
      createdUserIds.push(first.user.id);

      await expect(
        createUser(adminActor, {
          name: "Vitest Duplicate Second",
          email,
          roleCode: UserRole.HR,
        })
      ).rejects.toMatchObject({ code: ErrorCode.USER_EMAIL_ALREADY_EXISTS });
    });
  });

  describe("updateUser", () => {
    it("updates the name and increments the version", async () => {
      const result = await createUser(adminActor, {
        name: "Vitest Before Rename",
        email: trackedEmail("rename-target"),
        roleCode: UserRole.TEAM_MEMBER,
      });
      createdUserIds.push(result.user.id);

      const updated = await updateUser(adminActor, {
        userId: result.user.id,
        name: "Vitest After Rename",
      });

      expect(updated.name).toBe("Vitest After Rename");
      expect(updated.version).toBe(result.user.version + 1);
    });
  });

  describe("assignRole", () => {
    it("prevents an ADMIN actor from promoting a user to SUPER_ADMIN", async () => {
      const result = await createUser(adminActor, {
        name: "Vitest Promote Target",
        email: trackedEmail("promote-target"),
        roleCode: UserRole.MANAGER,
      });
      createdUserIds.push(result.user.id);

      await expect(
        assignRole(adminActor, { userId: result.user.id, roleCode: UserRole.SUPER_ADMIN })
      ).rejects.toMatchObject({ code: ErrorCode.USER_CANNOT_ASSIGN_SUPER_ADMIN });
    });

    it("allows reassigning between non-Super-Admin roles", async () => {
      const result = await createUser(adminActor, {
        name: "Vitest Reassign Target",
        email: trackedEmail("reassign-target"),
        roleCode: UserRole.MANAGER,
      });
      createdUserIds.push(result.user.id);

      const updated = await assignRole(adminActor, {
        userId: result.user.id,
        roleCode: UserRole.HR,
      });
      expect(updated.role.code).toBe(UserRole.HR);
    });
  });

  describe("setUserActive", () => {
    it("prevents an actor from deactivating themselves", async () => {
      const result = await createUser(adminActor, {
        name: "Vitest Self Target",
        email: trackedEmail("self-target"),
        roleCode: UserRole.ADMIN,
      });
      createdUserIds.push(result.user.id);

      const selfActor: AuthenticatedUser = { ...adminActor, id: result.user.id };

      await expect(
        setUserActive(selfActor, { userId: result.user.id, isActive: false })
      ).rejects.toMatchObject({ code: ErrorCode.USER_CANNOT_DEACTIVATE_SELF });
    });

    it("deactivates and reactivates a normal user", async () => {
      const result = await createUser(adminActor, {
        name: "Vitest Toggle Target",
        email: trackedEmail("toggle-target"),
        roleCode: UserRole.HR,
      });
      createdUserIds.push(result.user.id);

      const deactivated = await setUserActive(adminActor, {
        userId: result.user.id,
        isActive: false,
      });
      expect(deactivated.isActive).toBe(false);

      const reactivated = await setUserActive(adminActor, {
        userId: result.user.id,
        isActive: true,
      });
      expect(reactivated.isActive).toBe(true);
    });

    // The "last active Super Admin can't be deactivated" rule is exercised
    // as a pure unit test (tests/unit/authorization.test.ts) against a
    // fabricated count, since safely reproducing count === 1 here would
    // require deactivating the real seeded Super Admin, which these tests
    // must never touch. This test instead confirms the service correctly
    // computes a live count from the database and does NOT false-positive
    // block when more than one active Super Admin exists.
    it("allows deactivating a Super Admin when another remains active", async () => {
      const superAdminActor = await createActor(UserRole.SUPER_ADMIN, "super-admin");
      createdUserIds.push(superAdminActor.id);

      const result = await createUser(superAdminActor, {
        name: "Vitest Temp Super Admin",
        email: trackedEmail("temp-super-admin"),
        roleCode: UserRole.SUPER_ADMIN,
      });
      createdUserIds.push(result.user.id);

      const deactivated = await setUserActive(superAdminActor, {
        userId: result.user.id,
        isActive: false,
      });
      expect(deactivated.isActive).toBe(false);
    });
  });
});
