import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { QuotationStatus, QUOTATION_STATUS_TRANSITIONS } from "@/lib/crm/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import type { CreateQuotationInput, ChangeQuotationStatusInput } from "@/lib/validation/crm";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

function isQuotationTransitionAllowed(from: QuotationStatus, to: QuotationStatus): boolean {
  return QUOTATION_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function listQuotationsForLead(leadId: string) {
  return db.quotation.findMany({
    where: { leadId },
    include: { lines: true },
    orderBy: { version: "desc" },
  });
}

/** Each call creates a new version rather than mutating a previously-sent
 * quotation — see the Quotation model's doc comment in schema.prisma. */
export async function createQuotation(
  actor: AuthenticatedUser,
  input: CreateQuotationInput,
  meta: ActorMeta = {}
) {
  const previousVersionCount = await db.quotation.count({ where: { leadId: input.leadId } });
  const totalAmount = input.lines.reduce((sum, line) => sum + line.quantity * line.unitRate, 0);

  const quotation = await db.$transaction(async (tx) => {
    const created = await tx.quotation.create({
      data: {
        leadId: input.leadId,
        version: previousVersionCount + 1,
        totalAmount,
        validUntil: input.validUntil ? new Date(input.validUntil) : null,
        notes: input.notes || null,
        createdBy: actor.id,
        lines: {
          create: input.lines.map((line) => ({
            itemNo: line.itemNo,
            description: line.description,
            unit: line.unit,
            quantity: line.quantity,
            unitRate: line.unitRate,
            amount: line.quantity * line.unitRate,
          })),
        },
      },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.QUOTATION_CREATED,
      entityType: "Quotation",
      entityId: created.id,
      afterData: { leadId: input.leadId, version: created.version, totalAmount },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return created;
  });

  return quotation;
}

export async function changeQuotationStatus(
  actor: AuthenticatedUser,
  id: string,
  input: ChangeQuotationStatusInput,
  meta: ActorMeta = {}
) {
  const quotation = await db.quotation.findUnique({ where: { id } });
  if (!quotation) throw new AppError(ErrorCode.QUOTATION_NOT_FOUND);

  if (!isQuotationTransitionAllowed(quotation.status as QuotationStatus, input.status as QuotationStatus)) {
    throw new AppError(ErrorCode.QUOTATION_INVALID_STATUS_TRANSITION);
  }

  const updated = await db.quotation.update({ where: { id }, data: { status: input.status } });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.QUOTATION_STATUS_CHANGED,
    entityType: "Quotation",
    entityId: id,
    beforeData: { status: quotation.status },
    afterData: { status: input.status },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}
