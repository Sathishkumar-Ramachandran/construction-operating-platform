import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { PurchaseOrderStatus, StockTransactionType, StockReferenceType } from "@/lib/erp/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { writeStockTransaction } from "@/lib/services/stock-service";
import type { PostGoodsReceiptInput } from "@/lib/validation/erp";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

/**
 * Posts one receipt event against an APPROVED (or already
 * PARTIALLY_RECEIVED) PurchaseOrder. Writes a StockTransaction per line via
 * the existing writeStockTransaction (now warehouse-aware — receives into
 * the PO's warehouse), rolls each PurchaseOrderLine.quantityReceived
 * forward, and moves the PO to PARTIALLY_RECEIVED or RECEIVED depending on
 * whether every line is now fully received.
 */
export async function postGoodsReceipt(
  actor: AuthenticatedUser,
  input: PostGoodsReceiptInput,
  meta: ActorMeta = {}
) {
  const po = await db.purchaseOrder.findUnique({
    where: { id: input.purchaseOrderId },
    include: { lines: true },
  });
  if (!po) throw new AppError(ErrorCode.PURCHASE_ORDER_NOT_FOUND);
  if (po.status !== PurchaseOrderStatus.APPROVED && po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
    throw new AppError(ErrorCode.PURCHASE_ORDER_INVALID_STATUS_TRANSITION);
  }

  const lineById = new Map(po.lines.map((line) => [line.id, line]));
  for (const receiptLine of input.lines) {
    const poLine = lineById.get(receiptLine.purchaseOrderLineId);
    if (!poLine || poLine.purchaseOrderId !== po.id) throw new AppError(ErrorCode.NOT_FOUND);
    const remaining = Number(poLine.quantityOrdered) - Number(poLine.quantityReceived);
    if (receiptLine.quantityReceived > remaining) {
      throw new AppError(ErrorCode.PURCHASE_ORDER_RECEIPT_EXCEEDS_ORDERED);
    }
  }

  const receipt = await db.$transaction(async (tx) => {
    const created = await tx.goodsReceipt.create({
      data: {
        purchaseOrderId: po.id,
        receivedBy: actor.id,
        notes: input.notes || null,
        lines: {
          create: input.lines.map((line) => ({
            purchaseOrderLineId: line.purchaseOrderLineId,
            quantityReceived: line.quantityReceived,
          })),
        },
      },
    });

    for (const receiptLine of input.lines) {
      const poLine = lineById.get(receiptLine.purchaseOrderLineId)!;

      await tx.purchaseOrderLine.update({
        where: { id: poLine.id },
        data: { quantityReceived: { increment: receiptLine.quantityReceived } },
      });

      await writeStockTransaction(tx, actor, {
        materialId: poLine.materialId,
        warehouseId: po.warehouseId,
        type: StockTransactionType.RECEIPT,
        quantity: receiptLine.quantityReceived,
        referenceType: StockReferenceType.PURCHASE_ORDER,
        referenceId: po.id,
        notes: `Goods receipt against ${po.poNumber}.`,
      });
    }

    const refreshedLines = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: po.id } });
    const fullyReceived = refreshedLines.every(
      (line) => Number(line.quantityReceived) >= Number(line.quantityOrdered)
    );

    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: { status: fullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.GOODS_RECEIPT_POSTED,
      entityType: "PurchaseOrder",
      entityId: po.id,
      afterData: { goodsReceiptId: created.id, lineCount: input.lines.length },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return created;
  });

  return receipt;
}
