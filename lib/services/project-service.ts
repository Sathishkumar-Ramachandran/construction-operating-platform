import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import type { CreateProjectInput, CreateSiteInput } from "@/lib/validation/projects";
import type { AuthenticatedUser } from "@/types/auth";

/**
 * Minimal project/site master data — deliberately generic so a future,
 * full Project Management module extends these tables rather than
 * replacing them. Only what's needed to support employee allocation.
 */
export async function listProjects() {
  return db.project.findMany({
    where: { status: "ACTIVE" },
    include: { sites: { where: { isActive: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createProject(actor: AuthenticatedUser, input: CreateProjectInput) {
  const existing = await db.project.findUnique({ where: { code: input.code } });
  if (existing) throw new AppError(ErrorCode.MASTER_DATA_CODE_ALREADY_EXISTS);

  const project = await db.project.create({
    data: {
      code: input.code,
      name: input.name,
      clientName: input.clientName || null,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
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
