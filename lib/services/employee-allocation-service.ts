import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AssignmentStatus, EmploymentStatus, INACTIVE_EMPLOYMENT_STATUSES } from "@/lib/hr/constants";
import { ProjectStatus } from "@/lib/projects/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { assertActorCanManageAssignmentsForProject } from "@/lib/services/project-service";
import type { CreateAssignmentInput, EndAssignmentInput } from "@/lib/validation/allocation";
import type { AuthenticatedUser } from "@/types/auth";
import type { Prisma } from "@/generated/prisma/client";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

export async function listAssignmentsForEmployee(employeeId: string) {
  return db.employeeProjectAssignment.findMany({
    where: { employeeId },
    include: {
      project: { select: { id: true, code: true, name: true } },
      site: { select: { id: true, code: true, name: true } },
      projectRole: { select: { id: true, code: true, name: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export async function listAssignmentsForProject(
  projectId: string,
  options: { siteId?: string; status?: string } = {}
) {
  return db.employeeProjectAssignment.findMany({
    where: {
      projectId,
      ...(options.siteId ? { siteId: options.siteId } : {}),
      ...(options.status ? { status: options.status } : {}),
    },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, preferredName: true } },
      site: { select: { id: true, code: true, name: true } },
      projectRole: { select: { id: true, code: true, name: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

/** Relationship-scoped authorization primitive: is this employee currently
 * ACTIVE-assigned to this specific site? Same shape as isInReportingChain
 * (org-hierarchy-service.ts) — a relationship check, not a flat role/
 * permission check. Used to gate self-advancing a site's execution stage. */
export async function isActivelyAssignedToSite(
  employeeId: string,
  siteId: string
): Promise<boolean> {
  const match = await db.employeeProjectAssignment.findFirst({
    where: { employeeId, siteId, status: AssignmentStatus.ACTIVE },
    select: { id: true },
  });
  return match !== null;
}

/** Same shape as isActivelyAssignedToSite, at the project level — used to
 * scope Manager/Team Member project visibility and mutations. */
export async function isActivelyAssignedToProject(
  employeeId: string,
  projectId: string
): Promise<boolean> {
  const match = await db.employeeProjectAssignment.findFirst({
    where: { employeeId, projectId, status: AssignmentStatus.ACTIVE },
    select: { id: true },
  });
  return match !== null;
}

/** Do these two employees share an active assignment to the same project?
 * Used to scope a Manager marking attendance for a project teammate — not
 * a reporting-chain check (isInReportingChain), a project-membership one. */
export async function isActivelyAssignedToSameProject(
  employeeIdA: string,
  employeeIdB: string
): Promise<boolean> {
  const [projectsA, projectsB] = await Promise.all([
    db.employeeProjectAssignment.findMany({
      where: { employeeId: employeeIdA, status: AssignmentStatus.ACTIVE },
      select: { projectId: true },
    }),
    db.employeeProjectAssignment.findMany({
      where: { employeeId: employeeIdB, status: AssignmentStatus.ACTIVE },
      select: { projectId: true },
    }),
  ]);
  const setA = new Set(projectsA.map((p) => p.projectId));
  return projectsB.some((p) => setA.has(p.projectId));
}

async function getActiveAllocationTotal(
  employeeId: string,
  excludeAssignmentId?: string
): Promise<number> {
  const active = await db.employeeProjectAssignment.findMany({
    where: {
      employeeId,
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
      ...(excludeAssignmentId ? { NOT: { id: excludeAssignmentId } } : {}),
    },
    select: { allocationPercentage: true },
  });
  return active.reduce((sum, a) => sum + a.allocationPercentage, 0);
}

export async function createAssignment(
  actor: AuthenticatedUser,
  input: CreateAssignmentInput,
  meta: ActorMeta = {}
) {
  await assertActorCanManageAssignmentsForProject(actor, input.projectId);

  const employee = await db.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true, employmentStatus: true },
  });
  if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);
  if (INACTIVE_EMPLOYMENT_STATUSES.includes(employee.employmentStatus as EmploymentStatus)) {
    throw new AppError(ErrorCode.EMPLOYEE_INACTIVE);
  }

  const project = await db.project.findUnique({ where: { id: input.projectId } });
  if (!project || project.status !== ProjectStatus.ACTIVE) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Selected project is not active.");
  }

  if (input.siteId) {
    const site = await db.site.findUnique({ where: { id: input.siteId } });
    if (!site || !site.isActive) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "Selected site is not active.");
    }
    if (site.projectId !== input.projectId) {
      throw new AppError(ErrorCode.ASSIGNMENT_SITE_PROJECT_MISMATCH);
    }
  }

  const startDate = new Date(input.startDate);
  const endDate = input.endDate ? new Date(input.endDate) : null;
  if (endDate && endDate < startDate) {
    throw new AppError(ErrorCode.ASSIGNMENT_INVALID_DATES);
  }

  const currentTotal = await getActiveAllocationTotal(input.employeeId);
  if (currentTotal + input.allocationPercentage > 100) {
    throw new AppError(ErrorCode.ASSIGNMENT_OVER_ALLOCATED);
  }

  if (input.isPrimary) {
    await db.employeeProjectAssignment.updateMany({
      where: {
        employeeId: input.employeeId,
        isPrimary: true,
        status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
      },
      data: { isPrimary: false },
    });
  }

  return db.$transaction(async (tx) => {
    const assignment = await tx.employeeProjectAssignment.create({
      data: {
        employeeId: input.employeeId,
        projectId: input.projectId,
        siteId: input.siteId || null,
        projectRoleId: input.projectRoleId || null,
        allocationPercentage: input.allocationPercentage,
        startDate,
        endDate,
        isPrimary: input.isPrimary,
        status: startDate > new Date() ? AssignmentStatus.PLANNED : AssignmentStatus.ACTIVE,
        assignedBy: actor.id,
        notes: input.notes || null,
      },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.ASSIGNMENT_CREATED,
      entityType: "EmployeeProjectAssignment",
      entityId: assignment.id,
      afterData: {
        employeeId: input.employeeId,
        projectId: input.projectId,
        allocationPercentage: input.allocationPercentage,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return assignment;
  });
}

export async function endAssignment(
  actor: AuthenticatedUser,
  input: EndAssignmentInput,
  meta: ActorMeta = {}
) {
  const assignment = await db.employeeProjectAssignment.findUnique({
    where: { id: input.assignmentId },
  });
  if (!assignment) throw new AppError(ErrorCode.NOT_FOUND);

  const endDate = new Date(input.endDate);
  if (endDate < assignment.startDate) {
    throw new AppError(ErrorCode.ASSIGNMENT_INVALID_DATES);
  }

  return db.$transaction(async (tx) => {
    const updated = await tx.employeeProjectAssignment.update({
      where: { id: input.assignmentId },
      data: { endDate, status: AssignmentStatus.COMPLETED },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.ASSIGNMENT_ENDED,
      entityType: "EmployeeProjectAssignment",
      entityId: updated.id,
      afterData: { endDate: input.endDate },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return updated;
  });
}

/** Used by offboarding: closes every active/planned assignment immediately. */
export async function closeAllActiveAssignments(
  tx: Prisma.TransactionClient,
  employeeId: string
): Promise<number> {
  const result = await tx.employeeProjectAssignment.updateMany({
    where: {
      employeeId,
      status: { in: [AssignmentStatus.PLANNED, AssignmentStatus.ACTIVE] },
    },
    data: { status: AssignmentStatus.COMPLETED, endDate: new Date() },
  });
  return result.count;
}
