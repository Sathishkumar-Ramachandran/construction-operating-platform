import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { ProjectStatus, isProjectStatusTransitionAllowed } from "@/lib/projects/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { hasPermission } from "@/lib/services/authorization-service";
import { getActorEmployeeId } from "@/lib/services/employee-service";
import { isActivelyAssignedToProject } from "@/lib/services/employee-allocation-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import type {
  CreateProjectInput,
  CreateSiteInput,
  UpdateProjectInput,
  CloseProjectInput,
  ListProjectsQuery,
} from "@/lib/validation/projects";
import type { AuthenticatedUser } from "@/types/auth";
import type { Prisma } from "@/generated/prisma/client";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

/** Project *content* access boundary (workspace page, tasks, budget,
 * resource requests, documents) — only SUPER_ADMIN/ADMIN see every project
 * unrestricted; everyone else, including HR, must have an active
 * EmployeeProjectAssignment to this exact project. HR's org-wide
 * HR_ALLOCATION_MANAGE grant deliberately does NOT bypass this check: that
 * permission authorizes managing *assignment records* org-wide (see
 * assertActorCanManageAssignmentsForProject below), not viewing a project's
 * tasks/budget/documents. Throws PROJECT_NOT_FOUND (not a "forbidden" code)
 * so a project's existence isn't confirmed to someone who isn't on it. */
export async function assertActorCanAccessProject(
  actor: AuthenticatedUser,
  projectId: string
): Promise<void> {
  if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN) return;

  const employeeId = await getActorEmployeeId(actor.id);
  if (!employeeId || !(await isActivelyAssignedToProject(employeeId, projectId))) {
    throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
  }
}

/** Assignment-*mutation* boundary — deliberately broader than
 * assertActorCanAccessProject. SUPER_ADMIN/ADMIN and holders of the
 * org-wide HR_ALLOCATION_MANAGE grant may create assignments on any
 * project (that's the entire point of an org-wide allocation permission —
 * HR must be able to staff a project it isn't itself a member of); an
 * actor relying only on PROJECTS_TEAM_MANAGE (e.g. a Manager) stays scoped
 * to projects they can already access. Use this for assignment mutations
 * only — never for reading a project's tasks/budget/documents. */
export async function assertActorCanManageAssignmentsForProject(
  actor: AuthenticatedUser,
  projectId: string
): Promise<void> {
  if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN) return;
  if (await hasPermission(actor, PERMISSIONS.HR_ALLOCATION_MANAGE.code)) return;
  await assertActorCanAccessProject(actor, projectId);
}

export async function listProjects(query: ListProjectsQuery = {}) {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 200;

  const where: Prisma.ProjectWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { code: { contains: query.search, mode: "insensitive" } },
            { clientName: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.assignedEmployeeId
      ? { assignments: { some: { employeeId: query.assignedEmployeeId, status: "ACTIVE" } } }
      : {}),
  };

  const [total, projects] = await Promise.all([
    db.project.count({ where }),
    db.project.findMany({
      where,
      include: { sites: { where: { isActive: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { projects, total, page, pageSize };
}

export async function getProjectById(id: string) {
  const project = await db.project.findUnique({
    where: { id },
    include: { sites: { orderBy: { code: "asc" } } },
  });
  if (!project) throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
  return project;
}

export async function createProject(actor: AuthenticatedUser, input: CreateProjectInput) {
  const existing = await db.project.findUnique({ where: { code: input.code } });
  if (existing) throw new AppError(ErrorCode.MASTER_DATA_CODE_ALREADY_EXISTS);

  const project = await db.project.create({
    data: {
      code: input.code,
      name: input.name,
      clientName: input.clientName || null,
      description: input.description || null,
      address: input.address || null,
      estimatedBudget: input.estimatedBudget ?? null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      createdBy: actor.id,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "Project",
    entityId: project.id,
    afterData: { code: project.code, name: project.name },
  });

  return project;
}

export async function updateProject(
  actor: AuthenticatedUser,
  id: string,
  input: UpdateProjectInput
) {
  const existing = await db.project.findUnique({ where: { id } });
  if (!existing) throw new AppError(ErrorCode.PROJECT_NOT_FOUND);

  if (input.code !== existing.code) {
    const codeTaken = await db.project.findUnique({ where: { code: input.code } });
    if (codeTaken) throw new AppError(ErrorCode.MASTER_DATA_CODE_ALREADY_EXISTS);
  }

  return db.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        clientName: input.clientName || null,
        description: input.description || null,
        address: input.address || null,
        estimatedBudget: input.estimatedBudget ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.MASTER_DATA_UPDATED,
      entityType: "Project",
      entityId: project.id,
      beforeData: { code: existing.code, name: existing.name },
      afterData: { code: project.code, name: project.name },
    });

    return project;
  });
}

export async function activateProject(
  actor: AuthenticatedUser,
  id: string,
  meta: ActorMeta = {}
) {
  const project = await db.project.findUnique({ where: { id } });
  if (!project) throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
  if (!isProjectStatusTransitionAllowed(project.status as ProjectStatus, ProjectStatus.ACTIVE)) {
    throw new AppError(ErrorCode.PROJECT_INVALID_STATUS_TRANSITION);
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id },
      data: { status: ProjectStatus.ACTIVE },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.PROJECT_ACTIVATED,
      entityType: "Project",
      entityId: id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  });
}

/** Closure is a status transition only — never a delete. Does not force all
 * sites to Handover & Documentation first (Project/Team/Phases/Inventory are
 * ongoing activities throughout ACTIVE, not sequential gates); the UI is
 * expected to warn non-blockingly if sites aren't all complete. */
export async function closeProject(
  actor: AuthenticatedUser,
  id: string,
  input: CloseProjectInput,
  meta: ActorMeta = {}
) {
  const project = await db.project.findUnique({ where: { id } });
  if (!project) throw new AppError(ErrorCode.PROJECT_NOT_FOUND);
  if (!isProjectStatusTransitionAllowed(project.status as ProjectStatus, ProjectStatus.CLOSED)) {
    throw new AppError(ErrorCode.PROJECT_INVALID_STATUS_TRANSITION);
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.project.update({
      where: { id },
      data: { status: ProjectStatus.CLOSED, closedAt: new Date(), closedBy: actor.id },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.PROJECT_CLOSED,
      entityType: "Project",
      entityId: id,
      afterData: { notes: input.notes || null },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  });
}

export async function createSite(actor: AuthenticatedUser, input: CreateSiteInput) {
  const project = await db.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw new AppError(ErrorCode.NOT_FOUND);

  const site = await db.site.create({
    data: { projectId: input.projectId, code: input.code, name: input.name },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "Site",
    entityId: site.id,
    afterData: { code: site.code, name: site.name },
  });

  return site;
}
