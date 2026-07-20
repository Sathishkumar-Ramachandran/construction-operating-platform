import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import type { StockReferenceType, StockTransactionType } from "@/lib/erp/constants";
import type { AuthenticatedUser } from "@/types/auth";
import type { Prisma } from "@/generated/prisma/client";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

export type RecordStockTransactionInput = {
  materialId: string;
  type: StockTransactionType;
  quantity: number;
  referenceType?: StockReferenceType;
  referenceId?: string;
  notes?: string;
};

/** Writes an immutable StockTransaction row and updates the corresponding
 * StockLevel.quantityOnHand, atomically, given an already-open transaction
 * client — for callers that are themselves inside a transaction (e.g. an
 * approval-registry onApproved hook). Standalone callers should use
 * `recordStockTransaction` below instead, which opens its own transaction.
 *
 * RECEIPT/ADJUSTMENT(+) increase the balance; ISSUE/ADJUSTMENT(-) decrease
 * it. Deliberately allowed to go negative (backorder) — per the locked
 * product decision, stock is never a hard gate on approving a request.
 *
 * `actor` is nullable for engine-driven writes (e.g. an approval-registry
 * onApproved hook only receives an ApprovalRequestSummary, no deciding-actor
 * id) — same reasoning as SiteStageHistory's HANDOVER_APPROVED rows leaving
 * changedBy null.
 */
export async function writeStockTransaction(
  client: Prisma.TransactionClient,
  actor: AuthenticatedUser | null,
  input: RecordStockTransactionInput,
  meta: ActorMeta = {}
) {
  const material = await client.material.findUnique({ where: { id: input.materialId } });
  if (!material) throw new AppError(ErrorCode.MATERIAL_NOT_FOUND);

  const signedQuantity = input.type === "ISSUE" ? -Math.abs(input.quantity) : Math.abs(input.quantity);

  const transaction = await client.stockTransaction.create({
    data: {
      materialId: input.materialId,
      type: input.type,
      quantity: input.quantity,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      notes: input.notes ?? null,
      createdBy: actor?.id ?? null,
    },
  });

  const stockLevel = await client.stockLevel.upsert({
    where: { materialId: input.materialId },
    create: { materialId: input.materialId, quantityOnHand: signedQuantity },
    update: { quantityOnHand: { increment: signedQuantity } },
  });

  await recordAuditLog(client, {
    userId: actor?.id ?? null,
    action: AuditAction.STOCK_TRANSACTION_RECORDED,
    entityType: "Material",
    entityId: input.materialId,
    afterData: { type: input.type, quantity: input.quantity, newBalance: stockLevel.quantityOnHand.toString() },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return { transaction, stockLevel };
}

/** Standalone entry point — opens its own transaction around
 * writeStockTransaction. Use this when not already inside one. */
export async function recordStockTransaction(
  actor: AuthenticatedUser,
  input: RecordStockTransactionInput,
  meta: ActorMeta = {}
) {
  return db.$transaction((tx) => writeStockTransaction(tx, actor, input, meta));
}

export async function getStockLevel(materialId: string) {
  return db.stockLevel.findUnique({ where: { materialId } });
}

export async function listStockTransactionsForMaterial(materialId: string) {
  return db.stockTransaction.findMany({
    where: { materialId },
    orderBy: { createdAt: "desc" },
  });
}

/** Used by the resource-request approval flow to decide whether to surface
 * a backorder warning — never blocks, just informs the decision. */
export async function isMaterialBelowReorderLevel(materialId: string): Promise<boolean> {
  const [material, stockLevel] = await Promise.all([
    db.material.findUnique({ where: { id: materialId }, select: { reorderLevel: true } }),
    db.stockLevel.findUnique({ where: { materialId }, select: { quantityOnHand: true } }),
  ]);
  if (!material?.reorderLevel || !stockLevel) return false;
  return stockLevel.quantityOnHand.lessThanOrEqualTo(material.reorderLevel);
}
