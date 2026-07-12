import { describe, expect, it } from "vitest";
import { hasPermission, hasRole } from "@/lib/services/authorization-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";

// These tests read the real role-permission matrix written by `db:seed`
// (lib/authorization/permissions.ts -> DEFAULT_ROLE_PERMISSIONS). They only
// read; they never create or mutate rows.
describe("authorization-service against the seeded role/permission matrix", () => {
  it("grants ADMIN access to USERS.VIEW", async () => {
    const allowed = await hasPermission(
      { role: UserRole.ADMIN, isActive: true },
      PERMISSIONS.USERS_VIEW.code
    );
    expect(allowed).toBe(true);
  });

  it("does not grant ADMIN access to HR.EMPLOYEES.MANAGE", async () => {
    const allowed = await hasPermission(
      { role: UserRole.ADMIN, isActive: true },
      PERMISSIONS.HR_EMPLOYEES_MANAGE.code
    );
    expect(allowed).toBe(false);
  });

  it("grants HR access to HR.EMPLOYEES.MANAGE", async () => {
    const allowed = await hasPermission(
      { role: UserRole.HR, isActive: true },
      PERMISSIONS.HR_EMPLOYEES_MANAGE.code
    );
    expect(allowed).toBe(true);
  });

  it("does not grant HR access to USERS.CREATE", async () => {
    const allowed = await hasPermission(
      { role: UserRole.HR, isActive: true },
      PERMISSIONS.USERS_CREATE.code
    );
    expect(allowed).toBe(false);
  });

  it("grants MANAGER access to TEAM.MANAGE", async () => {
    const allowed = await hasPermission(
      { role: UserRole.MANAGER, isActive: true },
      PERMISSIONS.TEAM_MANAGE.code
    );
    expect(allowed).toBe(true);
  });

  it("grants TEAM_MEMBER access to HR.ATTENDANCE.VIEW but not TEAM.MANAGE", async () => {
    const attendance = await hasPermission(
      { role: UserRole.TEAM_MEMBER, isActive: true },
      PERMISSIONS.HR_ATTENDANCE_VIEW.code
    );
    const teamManage = await hasPermission(
      { role: UserRole.TEAM_MEMBER, isActive: true },
      PERMISSIONS.TEAM_MANAGE.code
    );
    expect(attendance).toBe(true);
    expect(teamManage).toBe(false);
  });

  it("hasRole matches an explicit allow-list for non-Super-Admin roles", async () => {
    const hrAllowed = await hasRole({ role: UserRole.HR, isActive: true }, [
      UserRole.HR,
      UserRole.MANAGER,
    ]);
    const teamMemberDenied = await hasRole(
      { role: UserRole.TEAM_MEMBER, isActive: true },
      [UserRole.HR, UserRole.MANAGER]
    );
    expect(hrAllowed).toBe(true);
    expect(teamMemberDenied).toBe(false);
  });
});
