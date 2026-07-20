import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/authorization/roles";
import { ErrorCode } from "@/lib/errors";
import { TaskStatus } from "@/lib/projects/constants";
import { createEmployee } from "@/lib/services/employee-service";
import { createAssignment } from "@/lib/services/employee-allocation-service";
import { createTask, updateTaskStatus } from "@/lib/services/task-service";
import { createActor, cleanupUserIds } from "@/tests/helpers/actors";
import {
  buildCreateEmployeeInput,
  createdEmployeeIds,
  createTestProject,
  createTestTask,
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

describe("task management (integration)", () => {
  afterAll(async () => {
    await cleanupHrFixtures();
    await cleanupUserIds(createdUserIds);
  });

  it("rejects creating a task for an assignee not on the project", async () => {
    const project = await createTestProject("task-assignee-off-project");
    const managerActor = await trackedActor(UserRole.MANAGER, "task-manager-1");
    const { employee: offProjectEmployee } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "task-off-project-1");
    const allocator = await trackedActor(UserRole.ADMIN, "task-allocator-1");
    // Manager must itself be on the project to pass assertActorCanAccessProject.
    const managerEmployee = await createEmployee(managerActor, await buildCreateEmployeeInput());
    createdEmployeeIds.push(managerEmployee.id);
    await db.employee.update({ where: { id: managerEmployee.id }, data: { userId: managerActor.id } });
    await assignActiveToProject(allocator, managerEmployee.id, project.id);

    await expect(
      createTask(managerActor, {
        projectId: project.id,
        title: "Prep scaffolding",
        assignedToEmployeeId: offProjectEmployee.id,
      })
    ).rejects.toMatchObject({ code: ErrorCode.TASK_ASSIGNEE_NOT_ON_PROJECT });
  });

  it("blocks a Manager creating a task on a project they're not assigned to", async () => {
    const project = await createTestProject("task-manager-off-project");
    const managerActor = await trackedActor(UserRole.MANAGER, "task-manager-2");
    const { employee: assignee } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "task-assignee-1");
    const allocator = await trackedActor(UserRole.ADMIN, "task-allocator-2");
    await assignActiveToProject(allocator, assignee.id, project.id);

    await expect(
      createTask(managerActor, {
        projectId: project.id,
        title: "Should be blocked",
        assignedToEmployeeId: assignee.id,
      })
    ).rejects.toMatchObject({ code: ErrorCode.PROJECT_NOT_FOUND });
  });

  it("lets the assignee self-advance TODO -> IN_PROGRESS -> DONE, but not to CANCELLED", async () => {
    const project = await createTestProject("task-self-advance");
    const { actor: assigneeActor, employee } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "task-worker-1");
    const allocator = await trackedActor(UserRole.ADMIN, "task-allocator-3");
    await assignActiveToProject(allocator, employee.id, project.id);
    const task = await createTestTask(project.id, employee.id);

    const inProgress = await updateTaskStatus(assigneeActor, { id: task.id, status: TaskStatus.IN_PROGRESS });
    expect(inProgress.status).toBe(TaskStatus.IN_PROGRESS);

    const done = await updateTaskStatus(assigneeActor, { id: task.id, status: TaskStatus.DONE });
    expect(done.status).toBe(TaskStatus.DONE);
    expect(done.completedAt).not.toBeNull();

    const anotherTask = await createTestTask(project.id, employee.id);
    await expect(
      updateTaskStatus(assigneeActor, { id: anotherTask.id, status: TaskStatus.CANCELLED })
    ).rejects.toMatchObject({ code: ErrorCode.TASK_NOT_AUTHORIZED });
  });

  it("rejects a status change from an unrelated actor without PROJECTS.TASK.MANAGE", async () => {
    const project = await createTestProject("task-unauthorized");
    const { employee } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "task-worker-2");
    const { actor: outsiderActor } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "task-outsider-1");
    const task = await createTestTask(project.id, employee.id);

    await expect(
      updateTaskStatus(outsiderActor, { id: task.id, status: TaskStatus.IN_PROGRESS })
    ).rejects.toMatchObject({ code: ErrorCode.TASK_NOT_AUTHORIZED });
  });

  it("lets a Manager with PROJECTS.TASK.MANAGE cancel a task on their own project", async () => {
    const project = await createTestProject("task-manager-cancel");
    const managerActor = await trackedActor(UserRole.MANAGER, "task-manager-3");
    const managerEmployee = await createEmployee(managerActor, await buildCreateEmployeeInput());
    createdEmployeeIds.push(managerEmployee.id);
    await db.employee.update({ where: { id: managerEmployee.id }, data: { userId: managerActor.id } });
    const allocator = await trackedActor(UserRole.ADMIN, "task-allocator-4");
    await assignActiveToProject(allocator, managerEmployee.id, project.id);

    const { employee: assignee } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "task-worker-3");
    await assignActiveToProject(allocator, assignee.id, project.id);
    const task = await createTask(managerActor, {
      projectId: project.id,
      title: "Site cleanup",
      assignedToEmployeeId: assignee.id,
    });

    const cancelled = await updateTaskStatus(managerActor, { id: task.id, status: TaskStatus.CANCELLED });
    expect(cancelled.status).toBe(TaskStatus.CANCELLED);
  });
});
