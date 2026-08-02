import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { ProjectStatus, TaskStatus } from "@/lib/projects/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { getActorEmployeeId } from "@/lib/services/employee-service";
import { hasPermission } from "@/lib/services/authorization-service";
import { assertActorCanAccessProject } from "@/lib/services/project-service";
import { isActivelyAssignedToProject } from "@/lib/services/employee-allocation-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import type { CreateTaskInput, UpdateTaskStatusInput, UpdateTaskProgressInput } from "@/lib/validation/tasks";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

const employeeSelect = {
  select: { id: true, firstName: true, lastName: true, preferredName: true },
} as const;

export async function listTasksForProject(
  projectId: string,
  options: { assignedToEmployeeId?: string } = {}
) {
  return db.task.findMany({
    where: {
      projectId,
      ...(options.assignedToEmployeeId ? { assignedToEmployeeId: options.assignedToEmployeeId } : {}),
    },
    include: {
      assignee: employeeSelect,
      site: { select: { id: true, code: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listTasksForEmployee(employeeId: string) {
  return db.task.findMany({
    where: { assignedToEmployeeId: employeeId },
    include: {
      assignee: employeeSelect,
      site: { select: { id: true, code: true, name: true } },
      project: { select: { id: true, code: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createTask(
  actor: AuthenticatedUser,
  input: CreateTaskInput,
  meta: ActorMeta = {}
) {
  await assertActorCanAccessProject(actor, input.projectId);

  const project = await db.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
  if (project.status !== ProjectStatus.ACTIVE) {
    throw new AppError(ErrorCode.PROJECT_NOT_ACTIVE);
  }

  if (input.siteId) {
    const site = await db.site.findUnique({ where: { id: input.siteId } });
    if (!site || site.projectId !== input.projectId) {
      throw new AppError(ErrorCode.SITE_NOT_FOUND);
    }
  }

  const assigneeOnProject = await isActivelyAssignedToProject(input.assignedToEmployeeId, input.projectId);
  if (!assigneeOnProject) throw new AppError(ErrorCode.TASK_ASSIGNEE_NOT_ON_PROJECT);

  const task = await db.task.create({
    data: {
      projectId: input.projectId,
      siteId: input.siteId || null,
      title: input.title,
      description: input.description || null,
      assignedToEmployeeId: input.assignedToEmployeeId,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      createdBy: actor.id,
      parentTaskId: input.parentTaskId || null,
      wbsCode: input.wbsCode || null,
      plannedStartDate: input.plannedStartDate ? new Date(input.plannedStartDate) : null,
      plannedEndDate: input.plannedEndDate ? new Date(input.plannedEndDate) : null,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.TASK_CREATED,
    entityType: "Task",
    entityId: task.id,
    afterData: { title: task.title, assignedToEmployeeId: task.assignedToEmployeeId },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return task;
}

/** WBS view: every task for the project, flat (the client nests by
 * parentTaskId — same shape as org-hierarchy-service's direct-reports list,
 * small enough per project to build the tree client-side rather than
 * round-tripping a recursive query). */
export async function listWbsForProject(projectId: string) {
  return db.task.findMany({
    where: { projectId },
    include: { assignee: employeeSelect, site: { select: { id: true, code: true, name: true } } },
    orderBy: [{ wbsCode: "asc" }, { createdAt: "asc" }],
  });
}

export async function updateTaskProgress(
  actor: AuthenticatedUser,
  input: UpdateTaskProgressInput,
  meta: ActorMeta = {}
) {
  const task = await db.task.findUnique({ where: { id: input.id } });
  if (!task) throw new AppError(ErrorCode.TASK_NOT_FOUND);

  const actorEmployeeId = await getActorEmployeeId(actor.id);
  const isOwnTask = actorEmployeeId !== null && actorEmployeeId === task.assignedToEmployeeId;
  if (!isOwnTask) {
    const canManage = await hasPermission(actor, PERMISSIONS.PROJECTS_WBS_MANAGE.code);
    if (!canManage) throw new AppError(ErrorCode.TASK_NOT_AUTHORIZED);
    await assertActorCanAccessProject(actor, task.projectId);
  }

  const updated = await db.task.update({
    where: { id: task.id },
    data: { percentComplete: input.percentComplete },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.TASK_STATUS_CHANGED,
    entityType: "Task",
    entityId: task.id,
    afterData: { percentComplete: input.percentComplete },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}

export async function updateTaskStatus(
  actor: AuthenticatedUser,
  input: UpdateTaskStatusInput,
  meta: ActorMeta = {}
) {
  const task = await db.task.findUnique({ where: { id: input.id } });
  if (!task) throw new AppError(ErrorCode.TASK_NOT_FOUND);

  const actorEmployeeId = await getActorEmployeeId(actor.id);
  const isOwnTask = actorEmployeeId !== null && actorEmployeeId === task.assignedToEmployeeId;

  if (isOwnTask) {
    if (input.status !== TaskStatus.IN_PROGRESS && input.status !== TaskStatus.DONE) {
      throw new AppError(ErrorCode.TASK_NOT_AUTHORIZED);
    }
  } else {
    const canManage = await hasPermission(actor, PERMISSIONS.PROJECTS_TASK_MANAGE.code);
    if (!canManage) throw new AppError(ErrorCode.TASK_NOT_AUTHORIZED);
    await assertActorCanAccessProject(actor, task.projectId);
  }

  const updated = await db.task.update({
    where: { id: task.id },
    data: {
      status: input.status,
      completedAt: input.status === TaskStatus.DONE ? new Date() : null,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.TASK_STATUS_CHANGED,
    entityType: "Task",
    entityId: task.id,
    beforeData: { status: task.status },
    afterData: { status: input.status },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}
