import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/authorization/roles";
import { ErrorCode } from "@/lib/errors";
import { AttendanceSource } from "@/lib/hr/constants";
import { createEmployee } from "@/lib/services/employee-service";
import { createAssignment } from "@/lib/services/employee-allocation-service";
import { correctAttendance } from "@/lib/services/attendance-service";
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

async function assignActiveToProject(allocator: AuthenticatedUser, employeeId: string, projectId: string) {
  return createAssignment(allocator, {
    employeeId,
    projectId,
    allocationPercentage: 100,
    startDate: yesterdayIso(),
    isPrimary: true,
  });
}

const todayIso = () => new Date().toISOString().slice(0, 10);

describe("Manager marks attendance for project teammates (integration)", () => {
  afterAll(async () => {
    await cleanupHrFixtures();
    await cleanupUserIds(createdUserIds);
  });

  it("lets a Manager mark a same-project Team Member's attendance with source MANAGER_MANUAL", async () => {
    const project = await createTestProject("attendance-manager-mark");
    const { actor: managerActor, employee: managerEmployee } = await createLinkedEmployee(
      UserRole.MANAGER,
      "attendance-manager-1"
    );
    const { employee: workerEmployee } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "attendance-worker-1");
    const allocator = await trackedActor(UserRole.ADMIN, "attendance-allocator-1");
    await assignActiveToProject(allocator, managerEmployee.id, project.id);
    await assignActiveToProject(allocator, workerEmployee.id, project.id);

    const record = await correctAttendance(managerActor, {
      employeeId: workerEmployee.id,
      date: todayIso(),
      status: "PRESENT",
      notes: "Marked by site manager.",
    });

    expect(record.status).toBe("PRESENT");
    expect(record.source).toBe(AttendanceSource.MANAGER_MANUAL);
  });

  it("rejects a Manager marking another Manager's attendance", async () => {
    const project = await createTestProject("attendance-manager-block-manager");
    const { actor: managerActor, employee: managerEmployee } = await createLinkedEmployee(
      UserRole.MANAGER,
      "attendance-manager-2"
    );
    const { employee: otherManagerEmployee } = await createLinkedEmployee(UserRole.MANAGER, "attendance-manager-3");
    const allocator = await trackedActor(UserRole.ADMIN, "attendance-allocator-2");
    await assignActiveToProject(allocator, managerEmployee.id, project.id);
    await assignActiveToProject(allocator, otherManagerEmployee.id, project.id);

    await expect(
      correctAttendance(managerActor, {
        employeeId: otherManagerEmployee.id,
        date: todayIso(),
        status: "PRESENT",
        notes: "Should be blocked.",
      })
    ).rejects.toMatchObject({ code: ErrorCode.ATTENDANCE_MARK_NOT_AUTHORIZED });
  });

  it("rejects a Manager marking an employee on a different project", async () => {
    const project = await createTestProject("attendance-manager-project-a");
    const otherProject = await createTestProject("attendance-manager-project-b");
    const { actor: managerActor, employee: managerEmployee } = await createLinkedEmployee(
      UserRole.MANAGER,
      "attendance-manager-4"
    );
    const { employee: workerEmployee } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "attendance-worker-2");
    const allocator = await trackedActor(UserRole.ADMIN, "attendance-allocator-3");
    await assignActiveToProject(allocator, managerEmployee.id, project.id);
    await assignActiveToProject(allocator, workerEmployee.id, otherProject.id);

    await expect(
      correctAttendance(managerActor, {
        employeeId: workerEmployee.id,
        date: todayIso(),
        status: "PRESENT",
        notes: "Should be blocked.",
      })
    ).rejects.toMatchObject({ code: ErrorCode.ATTENDANCE_MARK_NOT_AUTHORIZED });
  });

  it("keeps HR/Admin's org-wide correction unchanged, with source HR_MANUAL", async () => {
    const hrActor = await trackedActor(UserRole.HR, "attendance-hr-1");
    const { employee: workerEmployee } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "attendance-worker-3");

    const record = await correctAttendance(hrActor, {
      employeeId: workerEmployee.id,
      date: todayIso(),
      status: "PRESENT",
      notes: "HR correction.",
    });

    expect(record.source).toBe(AttendanceSource.HR_MANUAL);
  });
});
