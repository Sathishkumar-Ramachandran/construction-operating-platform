import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { PurchaseOrderStatus, PURCHASE_ORDER_STATUS_TRANSITIONS } from "@/lib/erp/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { ApprovalModule, registerApprovalModule, type ApprovalRequestSummary } from "@/lib/services/approval-registry";
import * as approvalService from "@/lib/services/approval-service";
import { UserRole } from "@/lib/authorization/roles";
import type { CreatePurchaseOrderInput } from "@/lib/validation/erp";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

function isPurchaseOrderTransitionAllowed(from: PurchaseOrderStatus, to: PurchaseOrderStatus): boolean {
  return PURCHASE_ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

async function nextPoNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.purchaseOrder.count({ where: { poNumber: { startsWith: `PO-${year}-` } } });
  return `PO-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function listPurchaseOrders() {
  return db.purchaseOrder.findMany({
    include: {
      supplier: { select: { id: true, code: true, name: true } },
      warehouse: { select: { id: true, code: true, name: true } },
      lines: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/** `canViewPricing` masks unitCost/totalAmount for a viewer who only holds
 * ERP.PURCHASE_ORDERS.VIEW (e.g. WAREHOUSE_KEEPER) — same masking pattern
 * as listBankAccountsMasked (employee-personal-service.ts): the caller
 * decides the access level, this function shapes the response to match. */
export async function getPurchaseOrderById(id: string, canViewPricing: boolean) {
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, code: true, name: true } },
      warehouse: { select: { id: true, code: true, name: true } },
      project: { select: { id: true, code: true, name: true } },
      lines: { include: { material: { select: { id: true, code: true, name: true, unit: true } } } },
      goodsReceipts: { include: { lines: true }, orderBy: { receivedAt: "desc" } },
    },
  });
  if (!po) throw new AppError(ErrorCode.PURCHASE_ORDER_NOT_FOUND);

  if (canViewPricing) return po;

  return {
    ...po,
    totalAmount: null,
    lines: po.lines.map((line) => ({ ...line, unitCost: null })),
  };
}

export async function createPurchaseOrder(
  actor: AuthenticatedUser,
  input: CreatePurchaseOrderInput,
  meta: ActorMeta = {}
) {
  const supplier = await db.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) throw new AppError(ErrorCode.SUPPLIER_NOT_FOUND);
  const warehouse = await db.warehouse.findUnique({ where: { id: input.warehouseId } });
  if (!warehouse) throw new AppError(ErrorCode.WAREHOUSE_NOT_FOUND);

  const totalAmount = input.lines.reduce((sum, line) => sum + line.quantityOrdered * line.unitCost, 0);
  const poNumber = await nextPoNumber();

  const po = await db.$transaction(async (tx) => {
    const created = await tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        projectId: input.projectId || null,
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
        notes: input.notes || null,
        totalAmount,
        status: PurchaseOrderStatus.DRAFT,
        createdBy: actor.id,
        lines: {
          create: input.lines.map((line) => ({
            materialId: line.materialId,
            quantityOrdered: line.quantityOrdered,
            unitCost: line.unitCost,
          })),
        },
      },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.PURCHASE_ORDER_CREATED,
      entityType: "PurchaseOrder",
      entityId: created.id,
      afterData: { poNumber, supplierId: input.supplierId, totalAmount },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return created;
  });

  return po;
}

export async function submitPurchaseOrder(actor: AuthenticatedUser, id: string, meta: ActorMeta = {}) {
  const po = await db.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new AppError(ErrorCode.PURCHASE_ORDER_NOT_FOUND);
  if (!isPurchaseOrderTransitionAllowed(po.status as PurchaseOrderStatus, PurchaseOrderStatus.SUBMITTED)) {
    throw new AppError(ErrorCode.PURCHASE_ORDER_INVALID_STATUS_TRANSITION);
  }

  const approvalRequest = await approvalService.createApprovalRequest(actor, {
    module: ApprovalModule.PURCHASE_ORDER,
    entityType: "PurchaseOrder",
    entityId: id,
    payload: { poNumber: po.poNumber, totalAmount: po.totalAmount.toString() },
    reason: `Purchase order ${po.poNumber}`,
  });

  const updated = await db.purchaseOrder.update({
    where: { id },
    data: { status: PurchaseOrderStatus.SUBMITTED, approvalRequestId: approvalRequest.id },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.PURCHASE_ORDER_SUBMITTED,
    entityType: "PurchaseOrder",
    entityId: id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}

export async function cancelPurchaseOrder(actor: AuthenticatedUser, id: string) {
  const po = await db.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw new AppError(ErrorCode.PURCHASE_ORDER_NOT_FOUND);
  if (!isPurchaseOrderTransitionAllowed(po.status as PurchaseOrderStatus, PurchaseOrderStatus.CANCELLED)) {
    throw new AppError(ErrorCode.PURCHASE_ORDER_INVALID_STATUS_TRANSITION);
  }
  return db.purchaseOrder.update({ where: { id }, data: { status: PurchaseOrderStatus.CANCELLED } });
}

registerApprovalModule(ApprovalModule.PURCHASE_ORDER, {
  async resolveApprovers() {
    // ERP.PURCHASE_ORDERS.APPROVE is Admin/Super-Admin only by design —
    // same segregation-of-duties reasoning as PAYROLL_RUN (preparer should
    // not also approve their own commitment of company funds).
    return [{ stepOrder: 1, approverRole: UserRole.ADMIN }];
  },

  async onApproved(tx, request: ApprovalRequestSummary) {
    const po = await tx.purchaseOrder.update({
      where: { id: request.entityId },
      data: { status: PurchaseOrderStatus.APPROVED },
    });

    // Roll into the project's MATERIAL budget line's committedAmount when
    // this PO was raised for a specific project — see
    // ProjectBudgetLine.committedAmount's doc comment in schema.prisma.
    if (po.projectId) {
      const materialLine = await tx.projectBudgetLine.findFirst({
        where: { projectId: po.projectId, category: "MATERIAL" },
      });
      if (materialLine) {
        await tx.projectBudgetLine.update({
          where: { id: materialLine.id },
          data: { committedAmount: { increment: po.totalAmount.toNumber() } },
        });
      }
    }
  },

  async onRejected(tx, request: ApprovalRequestSummary) {
    // Back to DRAFT (not a dead end) — preparer can revise pricing/lines
    // and resubmit, same shape as Payroll's PENDING_APPROVAL->OPEN.
    await tx.purchaseOrder.update({
      where: { id: request.entityId },
      data: { status: PurchaseOrderStatus.DRAFT, approvalRequestId: null },
    });
  },
});
