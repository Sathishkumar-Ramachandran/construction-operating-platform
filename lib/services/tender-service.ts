import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { TenderStatus, TENDER_STATUS_ORDER } from "@/lib/crm/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import type { TenderDetailsInput, AdvanceTenderStatusInput, SetTenderBoqLinesInput } from "@/lib/validation/crm";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

/**
 * Ordered-checklist transition rule (see TENDER_STATUS_ORDER's doc comment
 * in lib/crm/constants.ts): forward to any later stage in the order is
 * allowed (skipping optional stages like SITE_VISIT/QUERY_CLARIFICATION),
 * WITHDRAWN is reachable from anywhere non-terminal, but the two real
 * compliance gates are enforced explicitly below, not just by ordering.
 */
function isTenderTransitionAllowed(from: TenderStatus, to: TenderStatus): boolean {
  if (to === TenderStatus.WITHDRAWN) {
    return from !== TenderStatus.AWARDED && from !== TenderStatus.NOT_AWARDED && from !== TenderStatus.WITHDRAWN;
  }

  const fromIndex = TENDER_STATUS_ORDER.indexOf(from);
  if (fromIndex === -1) return false;

  // NOT_AWARDED isn't part of the forward-ordered checklist (it's an
  // outcome, not a stage) — reachable from SUBMITTED onward regardless of
  // TENDER_STATUS_ORDER's index-based rule below.
  if (to === TenderStatus.NOT_AWARDED) {
    return fromIndex >= TENDER_STATUS_ORDER.indexOf(TenderStatus.SUBMITTED);
  }

  const toIndex = TENDER_STATUS_ORDER.indexOf(to);
  if (toIndex === -1) return false;
  return toIndex > fromIndex;
}

export async function getTenderByLeadId(leadId: string) {
  const tender = await db.tender.findUnique({ where: { leadId }, include: { lines: true } });
  if (!tender) throw new AppError(ErrorCode.TENDER_NOT_FOUND);
  return tender;
}

export async function updateTenderDetails(
  actor: AuthenticatedUser,
  tenderId: string,
  input: TenderDetailsInput,
  meta: ActorMeta = {}
) {
  const tender = await db.tender.update({
    where: { id: tenderId },
    data: {
      tenderReferenceNo: input.tenderReferenceNo || null,
      issuingBody: input.issuingBody || null,
      noticeDate: input.noticeDate ? new Date(input.noticeDate) : null,
      documentCollectionDeadline: input.documentCollectionDeadline ? new Date(input.documentCollectionDeadline) : null,
      siteVisitMandatory: input.siteVisitMandatory,
      siteVisitDate: input.siteVisitDate ? new Date(input.siteVisitDate) : null,
      queryDeadline: input.queryDeadline ? new Date(input.queryDeadline) : null,
      submissionDeadline: input.submissionDeadline ? new Date(input.submissionDeadline) : null,
      tenderBondAmount: input.tenderBondAmount ?? null,
      evaluationMethod: input.evaluationMethod ?? null,
      bidAmount: input.bidAmount ?? null,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.TENDER_UPDATED,
    entityType: "Tender",
    entityId: tender.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return tender;
}

/** Full replace-on-write, same pattern as CompensationComponent
 * (payroll-service.ts) — a BOQ is small and admin-managed, easier to treat
 * as a whole than diff incrementally. `boqTotal` is recomputed and stored
 * on the parent Tender for cheap display. */
export async function setTenderBoqLines(
  actor: AuthenticatedUser,
  tenderId: string,
  input: SetTenderBoqLinesInput,
  meta: ActorMeta = {}
) {
  const boqTotal = input.lines.reduce((sum, line) => sum + line.quantity * line.unitRate, 0);

  const tender = await db.$transaction(async (tx) => {
    await tx.pricingLine.deleteMany({ where: { tenderId } });
    if (input.lines.length > 0) {
      await tx.pricingLine.createMany({
        data: input.lines.map((line) => ({
          tenderId,
          itemNo: line.itemNo,
          description: line.description,
          unit: line.unit,
          quantity: line.quantity,
          unitRate: line.unitRate,
          amount: line.quantity * line.unitRate,
        })),
      });
    }
    return tx.tender.update({ where: { id: tenderId }, data: { boqTotal } });
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.TENDER_UPDATED,
    entityType: "Tender",
    entityId: tenderId,
    afterData: { boqTotal, lineCount: input.lines.length },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return tender;
}

export async function advanceTenderStatus(
  actor: AuthenticatedUser,
  tenderId: string,
  input: AdvanceTenderStatusInput,
  meta: ActorMeta = {}
) {
  const tender = await db.tender.findUnique({ where: { id: tenderId } });
  if (!tender) throw new AppError(ErrorCode.TENDER_NOT_FOUND);

  if (!isTenderTransitionAllowed(tender.status as TenderStatus, input.status as TenderStatus)) {
    throw new AppError(ErrorCode.LEAD_INVALID_STATUS_TRANSITION);
  }
  if (input.status === TenderStatus.SUBMITTED && tender.bidAmount == null) {
    throw new AppError(ErrorCode.TENDER_MISSING_BID_AMOUNT);
  }

  const updated = await db.tender.update({
    where: { id: tenderId },
    data: {
      status: input.status,
      outcomeNotes: input.outcomeNotes || tender.outcomeNotes,
      submittedAt: input.status === TenderStatus.SUBMITTED ? new Date() : tender.submittedAt,
      openedAt: input.status === TenderStatus.OPENED ? new Date() : tender.openedAt,
      awardedAt: input.status === TenderStatus.AWARDED ? new Date() : tender.awardedAt,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.TENDER_SUBMITTED,
    entityType: "Tender",
    entityId: tenderId,
    beforeData: { status: tender.status },
    afterData: { status: input.status },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}
