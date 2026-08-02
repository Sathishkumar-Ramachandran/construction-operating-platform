import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { StockTransferStatus, STOCK_TRANSFER_STATUS_TRANSITIONS, StockTransactionType, StockReferenceType } from "@/lib/erp/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { writeStockTransaction } from "@/lib/services/stock-service";
import type { CreateStockTransferInput } from "@/lib/validation/erp";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

function isTransferTransitionAllowed(from: StockTransferStatus, to: StockTransferStatus): boolean {
  return STOCK_TRANSFER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function listStockTransfers() {
  return db.stockTransfer.findMany({
    include: {
      material: { select: { id: true, code: true, name: true, unit: true } },
      fromWarehouse: { select: { id: true, code: true, name: true } },
      toWarehouse: { select: { id: true, code: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStockTransfer(
  actor: AuthenticatedUser,
  input: CreateStockTransferInput,
  meta: ActorMeta = {}
) {
  if (input.fromWarehouseId === input.toWarehouseId) {
    throw new AppError(ErrorCode.STOCK_TRANSFER_SAME_WAREHOUSE);
  }

  const transfer = await db.stockTransfer.create({
    data: {
      materialId: input.materialId,
      fromWarehouseId: input.fromWarehouseId,
      toWarehouseId: input.toWarehouseId,
      quantity: input.quantity,
      notes: input.notes || null,
      requestedBy: actor.id,
      status: StockTransferStatus.PENDING,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.STOCK_TRANSFER_CREATED,
    entityType: "StockTransfer",
    entityId: transfer.id,
    afterData: { materialId: input.materialId, quantity: input.quantity },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return transfer;
}

/** Dispatches from the source warehouse — this is where the ISSUE-side
 * stock write happens (see the StockTransfer model doc comment in
 * schema.prisma for why this is two separate writes, not one atomic move). */
export async function dispatchStockTransfer(actor: AuthenticatedUser, id: string, meta: ActorMeta = {}) {
  const transfer = await db.stockTransfer.findUnique({ where: { id } });
  if (!transfer) throw new AppError(ErrorCode.STOCK_TRANSFER_NOT_FOUND);
  if (!isTransferTransitionAllowed(transfer.status as StockTransferStatus, StockTransferStatus.IN_TRANSIT)) {
    throw new AppError(ErrorCode.STOCK_TRANSFER_INVALID_STATUS_TRANSITION);
  }

  const updated = await db.$transaction(async (tx) => {
    await writeStockTransaction(tx, actor, {
      materialId: transfer.materialId,
      warehouseId: transfer.fromWarehouseId,
      type: StockTransactionType.ISSUE,
      quantity: Number(transfer.quantity),
      referenceType: StockReferenceType.STOCK_TRANSFER,
      referenceId: transfer.id,
      notes: "Dispatched for inter-warehouse stock transfer.",
    });

    return tx.stockTransfer.update({
      where: { id },
      data: { status: StockTransferStatus.IN_TRANSIT, dispatchedAt: new Date() },
    });
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.STOCK_TRANSFER_DISPATCHED,
    entityType: "StockTransfer",
    entityId: id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}

/** Confirms physical receipt at the destination — writes the RECEIPT-side
 * stock transaction only now, not at dispatch. Typically performed by the
 * destination warehouse's WAREHOUSE_KEEPER. */
export async function receiveStockTransfer(actor: AuthenticatedUser, id: string, meta: ActorMeta = {}) {
  const transfer = await db.stockTransfer.findUnique({ where: { id } });
  if (!transfer) throw new AppError(ErrorCode.STOCK_TRANSFER_NOT_FOUND);
  if (!isTransferTransitionAllowed(transfer.status as StockTransferStatus, StockTransferStatus.RECEIVED)) {
    throw new AppError(ErrorCode.STOCK_TRANSFER_INVALID_STATUS_TRANSITION);
  }

  const updated = await db.$transaction(async (tx) => {
    await writeStockTransaction(tx, actor, {
      materialId: transfer.materialId,
      warehouseId: transfer.toWarehouseId,
      type: StockTransactionType.RECEIPT,
      quantity: Number(transfer.quantity),
      referenceType: StockReferenceType.STOCK_TRANSFER,
      referenceId: transfer.id,
      notes: "Received from inter-warehouse stock transfer.",
    });

    return tx.stockTransfer.update({
      where: { id },
      data: { status: StockTransferStatus.RECEIVED, receivedBy: actor.id, receivedAt: new Date() },
    });
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.STOCK_TRANSFER_RECEIVED,
    entityType: "StockTransfer",
    entityId: id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}

export async function cancelStockTransfer(actor: AuthenticatedUser, id: string) {
  const transfer = await db.stockTransfer.findUnique({ where: { id } });
  if (!transfer) throw new AppError(ErrorCode.STOCK_TRANSFER_NOT_FOUND);
  if (!isTransferTransitionAllowed(transfer.status as StockTransferStatus, StockTransferStatus.CANCELLED)) {
    throw new AppError(ErrorCode.STOCK_TRANSFER_INVALID_STATUS_TRANSITION);
  }
  return db.stockTransfer.update({ where: { id }, data: { status: StockTransferStatus.CANCELLED } });
}
