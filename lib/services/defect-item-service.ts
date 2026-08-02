import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { DefectItemStatus, DEFECT_ITEM_STATUS_TRANSITIONS } from "@/lib/projects/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import type { CreateDefectItemInput, ChangeDefectItemStatusInput } from "@/lib/validation/projects";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

function isDefectTransitionAllowed(from: DefectItemStatus, to: DefectItemStatus): boolean {
  return DEFECT_ITEM_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function listDefectsForProject(projectId: string) {
  return db.defectItem.findMany({
    where: { projectId },
    include: { site: { select: { id: true, code: true, name: true } } },
    orderBy: { reportedAt: "desc" },
  });
}

export async function createDefectItem(
  actor: AuthenticatedUser,
  input: CreateDefectItemInput,
  meta: ActorMeta = {}
) {
  const defect = await db.defectItem.create({
    data: {
      projectId: input.projectId,
      siteId: input.siteId || null,
      description: input.description,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      reportedBy: actor.id,
      status: DefectItemStatus.OPEN,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.DEFECT_ITEM_LOGGED,
    entityType: "DefectItem",
    entityId: defect.id,
    afterData: { projectId: input.projectId, description: input.description },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return defect;
}

export async function changeDefectItemStatus(
  actor: AuthenticatedUser,
  id: string,
  input: ChangeDefectItemStatusInput,
  meta: ActorMeta = {}
) {
  const defect = await db.defectItem.findUnique({ where: { id } });
  if (!defect) throw new AppError(ErrorCode.DEFECT_ITEM_NOT_FOUND);

  if (!isDefectTransitionAllowed(defect.status as DefectItemStatus, input.status as DefectItemStatus)) {
    throw new AppError(ErrorCode.DEFECT_ITEM_INVALID_STATUS_TRANSITION);
  }

  const updated = await db.defectItem.update({
    where: { id },
    data: {
      status: input.status,
      notes: input.notes || defect.notes,
      rectifiedAt: input.status === DefectItemStatus.RECTIFIED ? new Date() : defect.rectifiedAt,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.DEFECT_ITEM_STATUS_CHANGED,
    entityType: "DefectItem",
    entityId: id,
    beforeData: { status: defect.status },
    afterData: { status: input.status },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}
