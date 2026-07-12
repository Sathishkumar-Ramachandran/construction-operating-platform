import { describe, expect, it } from "vitest";
import {
  hasPermission,
  hasRole,
  assertCanCreateUser,
  assertCanModifyUser,
  assertCanAssignRole,
  assertCanSetUserActive,
} from "@/lib/services/authorization-service";
import { AppError, ErrorCode } from "@/lib/errors";
import { UserRole } from "@/lib/authorization/roles";

describe("Super Admin bypass", () => {
  it("hasPermission always allows an active Super Admin without a DB lookup", async () => {
    const allowed = await hasPermission(
      { role: UserRole.SUPER_ADMIN, isActive: true },
      "SOME.MADE_UP.PERMISSION" as never
    );
    expect(allowed).toBe(true);
  });

  it("hasRole always allows an active Super Admin, regardless of the role list", async () => {
    const allowed = await hasRole(
      { role: UserRole.SUPER_ADMIN, isActive: true },
      [UserRole.HR]
    );
    expect(allowed).toBe(true);
  });

  it("denies an inactive Super Admin", async () => {
    const allowed = await hasPermission(
      { role: UserRole.SUPER_ADMIN, isActive: false },
      "SOME.MADE_UP.PERMISSION" as never
    );
    expect(allowed).toBe(false);
  });

  it("denies an inactive non-Super-Admin without hitting the database", async () => {
    const allowed = await hasRole(
      { role: UserRole.ADMIN, isActive: false },
      [UserRole.ADMIN]
    );
    expect(allowed).toBe(false);
  });
});

describe("assertCanCreateUser", () => {
  it("prevents ADMIN from creating a SUPER_ADMIN", () => {
    expect(() =>
      assertCanCreateUser(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ).toThrow(AppError);
  });

  it("allows SUPER_ADMIN to create a SUPER_ADMIN", () => {
    expect(() =>
      assertCanCreateUser(UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN)
    ).not.toThrow();
  });

  it("allows ADMIN to create non-Super-Admin users", () => {
    expect(() =>
      assertCanCreateUser(UserRole.ADMIN, UserRole.MANAGER)
    ).not.toThrow();
  });
});

describe("assertCanModifyUser", () => {
  it("prevents ADMIN from modifying an existing SUPER_ADMIN", () => {
    expect(() =>
      assertCanModifyUser(UserRole.ADMIN, UserRole.SUPER_ADMIN)
    ).toThrow(AppError);
  });

  it("allows SUPER_ADMIN to modify a SUPER_ADMIN", () => {
    expect(() =>
      assertCanModifyUser(UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN)
    ).not.toThrow();
  });
});

describe("assertCanAssignRole", () => {
  it("prevents ADMIN from promoting a user to SUPER_ADMIN", () => {
    expect(() =>
      assertCanAssignRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
    ).toThrow(AppError);
  });

  it("prevents ADMIN from changing an existing SUPER_ADMIN's role", () => {
    expect(() =>
      assertCanAssignRole(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
    ).toThrow(AppError);
  });

  it("allows SUPER_ADMIN to promote a user to SUPER_ADMIN", () => {
    expect(() =>
      assertCanAssignRole(UserRole.SUPER_ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
    ).not.toThrow();
  });

  it("allows ADMIN to reassign between non-Super-Admin roles", () => {
    expect(() =>
      assertCanAssignRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.HR)
    ).not.toThrow();
  });
});

describe("assertCanSetUserActive", () => {
  const base = {
    actorId: "actor-1",
    actorRole: UserRole.ADMIN,
    targetId: "target-1",
    targetRole: UserRole.MANAGER,
    targetIsActive: true,
    nextIsActive: false,
    activeSuperAdminCount: 2,
  };

  it("prevents self-deactivation", () => {
    expect(() =>
      assertCanSetUserActive({ ...base, actorId: "same", targetId: "same" })
    ).toThrow(AppError);
  });

  it("prevents deactivating the last active Super Admin", () => {
    expect(() =>
      assertCanSetUserActive({
        ...base,
        actorRole: UserRole.SUPER_ADMIN,
        targetRole: UserRole.SUPER_ADMIN,
        activeSuperAdminCount: 1,
      })
    ).toThrowError(
      expect.objectContaining({ code: ErrorCode.USER_LAST_SUPER_ADMIN_REQUIRED })
    );
  });

  it("allows deactivating a Super Admin when others remain active", () => {
    expect(() =>
      assertCanSetUserActive({
        ...base,
        actorRole: UserRole.SUPER_ADMIN,
        targetRole: UserRole.SUPER_ADMIN,
        activeSuperAdminCount: 2,
      })
    ).not.toThrow();
  });

  it("prevents ADMIN from touching a Super Admin's active status at all", () => {
    expect(() =>
      assertCanSetUserActive({
        ...base,
        targetRole: UserRole.SUPER_ADMIN,
        nextIsActive: true,
        activeSuperAdminCount: 5,
      })
    ).toThrow(AppError);
  });

  it("allows a normal deactivation", () => {
    expect(() => assertCanSetUserActive(base)).not.toThrow();
  });

  it("allows reactivation without self/last-admin checks", () => {
    expect(() =>
      assertCanSetUserActive({ ...base, nextIsActive: true })
    ).not.toThrow();
  });
});
