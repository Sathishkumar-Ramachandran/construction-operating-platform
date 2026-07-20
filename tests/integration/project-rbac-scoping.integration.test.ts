import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/authorization/roles";
import { ErrorCode } from "@/lib/errors";
import { createEmployee } from "@/lib/services/employee-service";
import { createAssignment } from "@/lib/services/employee-allocation-service";
import { listProjects, assertActorCanAccessProject } from "@/lib/services/project-service";
import { createActor, cleanupUserIds } from "@/tests/helpers/actors";
import {
  buildCreateEmployeeInput,
  createdEmployeeIds,
  createTestProject,
  cleanupHrFixtures,
} from "@/tests/helpers/hr-fixtures";
import type { AuthenticatedUser } from "@/types/auth";

const createdUserIds: string[] = [];

async function trackedActor(role: UserRole, label: string): Promise<AuthenticatedUser> {
  const actor = await createActor(role, label);
  createdUserIds.push(actor.id);
  return actor;
}

async function createLinkedEmployee(actorRole: UserRole, label: string) {
  const actor = await trackedActor(actorRole, label);
  const employee = await createEmployee(actor, await buildCreateEmployeeInput());
  createdEmployeeIds.push(employee.id);
  await db.employee.update({ where: { id: employee.id }, data: { userId: actor.id } });
  return { actor, employee };
}

function yesterdayIso(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

describe("project RBAC scoping (integration)", () => {
  afterAll(async () => {
    await cleanupHrFixtures();
    await cleanupUserIds(createdUserIds);
  });

  it("scopes listProjects to only a Manager's actively assigned project", async () => {
    const ownProject = await createTestProject("rbac-manager-own");
    const otherProject = await createTestProject("rbac-manager-other");
    const { employee } = await createLinkedEmployee(UserRole.MANAGER, "rbac-manager-1");
    const allocator = await trackedActor(UserRole.ADMIN, "rbac-allocator-1");

    await createAssignment(allocator, {
      employeeId: employee.id,
      projectId: ownProject.id,
      allocationPercentage: 100,
      startDate: yesterdayIso(),
      isPrimary: true,
    });

    const { projects } = await listProjects({ assignedEmployeeId: employee.id });
    expect(projects.map((p) => p.id)).toEqual([ownProject.id]);
    expect(projects.map((p) => p.id)).not.toContain(otherProject.id);
  });

  it("blocks assertActorCanAccessProject for a Manager on a project they're not assigned to", async () => {
    const project = await createTestProject("rbac-manager-block");
    const { actor: managerActor } = await createLinkedEmployee(UserRole.MANAGER, "rbac-manager-2");

    await expect(assertActorCanAccessProject(managerActor, project.id)).rejects.toMatchObject({
      code: ErrorCode.PROJECT_NOT_FOUND,
    });
  });

  it("allows assertActorCanAccessProject for a Manager actively assigned to the project", async () => {
    const project = await createTestProject("rbac-manager-allow");
    const { actor: managerActor, employee } = await createLinkedEmployee(UserRole.MANAGER, "rbac-manager-3");
    const allocator = await trackedActor(UserRole.ADMIN, "rbac-allocator-2");

    await createAssignment(allocator, {
      employeeId: employee.id,
      projectId: project.id,
      allocationPercentage: 100,
      startDate: yesterdayIso(),
      isPrimary: true,
    });

    await expect(assertActorCanAccessProject(managerActor, project.id)).resolves.toBeUndefined();
  });

  it("scopes a Team Member the same way as a Manager", async () => {
    const project = await createTestProject("rbac-team-member-block");
    const { actor: teamMemberActor } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "rbac-team-member-1");

    await expect(assertActorCanAccessProject(teamMemberActor, project.id)).rejects.toMatchObject({
      code: ErrorCode.PROJECT_NOT_FOUND,
    });
  });

  it("never scopes Admin/Super Admin or HR's org-wide allocation grant", async () => {
    const project = await createTestProject("rbac-admin-bypass");
    const adminActor = await trackedActor(UserRole.ADMIN, "rbac-admin-1");
    const superAdminActor = await trackedActor(UserRole.SUPER_ADMIN, "rbac-super-admin-1");
    const hrActor = await trackedActor(UserRole.HR, "rbac-hr-1");

    await expect(assertActorCanAccessProject(adminActor, project.id)).resolves.toBeUndefined();
    await expect(assertActorCanAccessProject(superAdminActor, project.id)).resolves.toBeUndefined();
    await expect(assertActorCanAccessProject(hrActor, project.id)).resolves.toBeUndefined();
  });
});
