import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { ProjectStatus } from "@/lib/projects/constants";
import { StockReferenceType, StockTransactionType } from "@/lib/erp/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { getActorEmployeeId } from "@/lib/services/employee-service";
import { hasPermission } from "@/lib/services/authorization-service";
import { assertActorCanAccessProject } from "@/lib/services/project-service";
import { writeStockTransaction } from "@/lib/services/stock-service";
import { getDefaultWarehouse } from "@/lib/services/warehouse-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import * as approvalService from "@/lib/services/approval-service";
import {
  ApprovalModule,
  registerApprovalModule,
  type ApprovalRequestSummary,
} from "@/lib/services/approval-registry";
import type { CreateResourceRequestInput } from "@/lib/validation/resource-requests";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

export async function listResourceRequestsForProject(projectId: string) {
  return db.projectResourceRequest.findMany({
    where: { projectId },
    include: {
      site: { select: { id: true, code: true, name: true } },
      material: { select: { id: true, code: true, name: true, unit: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createResourceRequest(
  actor: AuthenticatedUser,
  input: CreateResourceRequestInput,
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
      throw new AppError(ErrorCode.ASSIGNMENT_SITE_PROJECT_MISMATCH);
    }
  }

  // Materials must come from the ERP catalog, never free text.
  const material = await db.material.findUnique({ where: { id: input.materialId } });
  if (!material || !material.isActive) {
    throw new AppError(ErrorCode.MATERIAL_NOT_FOUND);
  }

  const employeeId = await getActorEmployeeId(actor.id);

  // Chosen now, not at approval-decision time — the approval engine's
  // decideApprovalStep only ever carries {decision, notes} (see
  // approval-service.ts), so the onApproved hook below needs this already
  // on the row. Falls back to the company default warehouse if the
  // requester didn't pick one explicitly (the common case with one
  // warehouse); requires an explicit choice once there's more than one and
  // no MAIN warehouse is designated.
  const fulfillmentWarehouseId = input.fulfillmentWarehouseId || (await getDefaultWarehouse())?.id;
  if (!fulfillmentWarehouseId) throw new AppError(ErrorCode.WAREHOUSE_NOT_FOUND);

  const request = await db.projectResourceRequest.create({
    data: {
      projectId: input.projectId,
      siteId: input.siteId || null,
      materialId: material.id,
      itemDescription: material.name,
      quantity: input.quantity,
      unit: material.unit,
      neededByDate: input.neededByDate ? new Date(input.neededByDate) : null,
      notes: input.notes || null,
      requestedByUserId: actor.id,
      requestedByEmployeeId: employeeId,
      fulfillmentWarehouseId,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.RESOURCE_REQUEST_CREATED,
    entityType: "ProjectResourceRequest",
    entityId: request.id,
    afterData: { materialId: material.id, itemDescription: material.name, quantity: input.quantity, unit: material.unit },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const approvalRequest = await approvalService.createApprovalRequest(
    actor,
    {
      module: ApprovalModule.EQUIPMENT_REQUEST,
      entityType: "ProjectResourceRequest",
      entityId: request.id,
      payload: { materialId: material.id, itemDescription: material.name, quantity: input.quantity, unit: material.unit },
      reason: `${input.quantity} ${material.unit} × ${material.name}`,
      requestedByEmployeeId: employeeId,
    },
    meta
  );

  return db.projectResourceRequest.update({
    where: { id: request.id },
    data: { approvalRequestId: approvalRequest.id },
  });
}

export async function cancelResourceRequest(
  actor: AuthenticatedUser,
  id: string,
  meta: ActorMeta = {}
) {
  const request = await db.projectResourceRequest.findUnique({ where: { id } });
  if (!request) throw new AppError(ErrorCode.RESOURCE_REQUEST_NOT_FOUND);

  const isRequester = request.requestedByUserId === actor.id;
  if (!isRequester) {
    const canManage = await hasPermission(actor, PERMISSIONS.PROJECTS_RESOURCE_REQUEST_MANAGE.code);
    if (!canManage) throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);
  }

  if (request.status !== "PENDING") {
    throw new AppError(ErrorCode.RESOURCE_REQUEST_NOT_CANCELLABLE);
  }

  if (request.approvalRequestId) {
    await approvalService.cancelApprovalRequest(
      actor,
      { approvalRequestId: request.approvalRequestId, reason: "Resource request cancelled by requester." },
      meta
    );
  }

  const updated = await db.projectResourceRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.RESOURCE_REQUEST_CANCELLED,
    entityType: "ProjectResourceRequest",
    entityId: id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}

// --- Approval Engine registration ------------------------------------------

registerApprovalModule(ApprovalModule.EQUIPMENT_REQUEST, {
  async resolveApprovers() {
    return [{ stepOrder: 1, approverRole: UserRole.ADMIN }];
  },

  async onApproved(tx, request: ApprovalRequestSummary) {
    const updated = await tx.projectResourceRequest.update({
      where: { id: request.entityId },
      data: { status: "APPROVED" },
    });

    // Issue stock for the approved quantity — allowed to go negative
    // (backorder) per the locked product decision; this never blocks the
    // approval itself. No-op if the request predates the material link.
    // fulfillmentWarehouseId is guaranteed set by createResourceRequest
    // (which throws if no warehouse could be resolved), so every approvable
    // request already has one — no fallback needed here.
    if (updated.materialId && updated.fulfillmentWarehouseId) {
      await writeStockTransaction(tx, null, {
        materialId: updated.materialId,
        warehouseId: updated.fulfillmentWarehouseId,
        type: StockTransactionType.ISSUE,
        quantity: Number(updated.quantity),
        referenceType: StockReferenceType.PROJECT_RESOURCE_REQUEST,
        referenceId: updated.id,
        notes: `Issued for ${updated.itemDescription} on approval of resource request.`,
      });
    }
  },

  async onRejected(tx, request: ApprovalRequestSummary) {
    await tx.projectResourceRequest.update({
      where: { id: request.entityId },
      data: { status: "REJECTED" },
    });
  },
});
