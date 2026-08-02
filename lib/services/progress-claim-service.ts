import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { ProgressClaimStatus, PROGRESS_CLAIM_STATUS_TRANSITIONS } from "@/lib/projects/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { ApprovalModule, registerApprovalModule, type ApprovalRequestSummary } from "@/lib/services/approval-registry";
import * as approvalService from "@/lib/services/approval-service";
import { UserRole } from "@/lib/authorization/roles";
import type { CreateProgressClaimInput } from "@/lib/validation/projects";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

function isClaimTransitionAllowed(from: ProgressClaimStatus, to: ProgressClaimStatus): boolean {
  return PROGRESS_CLAIM_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function listProgressClaimsForProject(projectId: string) {
  return db.progressClaim.findMany({ where: { projectId }, orderBy: { claimNumber: "desc" } });
}

/**
 * Submits a monthly interim claim and routes it straight to certification
 * via the generic approval engine (PROGRESS_CLAIM module) — same
 * prepare-then-submit-for-approval shape as Payroll's processPayrollRun,
 * just without a separate "processing" compute step since there's nothing
 * to compute here beyond what the preparer enters.
 */
export async function createProgressClaim(
  actor: AuthenticatedUser,
  input: CreateProgressClaimInput,
  meta: ActorMeta = {}
) {
  const lastClaim = await db.progressClaim.findFirst({
    where: { projectId: input.projectId },
    orderBy: { claimNumber: "desc" },
  });
  const claimNumber = (lastClaim?.claimNumber ?? 0) + 1;
  const retentionHeld = Math.round(input.claimedAmount * (input.retentionPercentage / 100) * 100) / 100;

  const claim = await db.$transaction(async (tx) => {
    const created = await tx.progressClaim.create({
      data: {
        projectId: input.projectId,
        claimNumber,
        claimPeriodTo: new Date(input.claimPeriodTo),
        claimedAmount: input.claimedAmount,
        retentionPercentage: input.retentionPercentage,
        retentionHeld,
        notes: input.notes || null,
        status: ProgressClaimStatus.DRAFT,
      },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.PROGRESS_CLAIM_SUBMITTED,
      entityType: "ProgressClaim",
      entityId: created.id,
      afterData: { projectId: input.projectId, claimNumber, claimedAmount: input.claimedAmount },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return created;
  });

  return claim;
}

export async function submitProgressClaimForCertification(actor: AuthenticatedUser, id: string) {
  const claim = await db.progressClaim.findUnique({ where: { id } });
  if (!claim) throw new AppError(ErrorCode.PROGRESS_CLAIM_NOT_FOUND);
  if (!isClaimTransitionAllowed(claim.status as ProgressClaimStatus, ProgressClaimStatus.PENDING_APPROVAL)) {
    throw new AppError(ErrorCode.PROGRESS_CLAIM_INVALID_STATUS_TRANSITION);
  }

  const approvalRequest = await approvalService.createApprovalRequest(actor, {
    module: ApprovalModule.PROGRESS_CLAIM,
    entityType: "ProgressClaim",
    entityId: id,
    payload: { claimNumber: claim.claimNumber, claimedAmount: claim.claimedAmount.toString() },
    reason: `Progress claim #${claim.claimNumber}`,
  });

  return db.progressClaim.update({
    where: { id },
    data: {
      status: ProgressClaimStatus.PENDING_APPROVAL,
      approvalRequestId: approvalRequest.id,
      submittedBy: actor.id,
      submittedAt: new Date(),
    },
  });
}

export async function markProgressClaimPaid(id: string) {
  const claim = await db.progressClaim.findUnique({ where: { id } });
  if (!claim) throw new AppError(ErrorCode.PROGRESS_CLAIM_NOT_FOUND);
  if (!isClaimTransitionAllowed(claim.status as ProgressClaimStatus, ProgressClaimStatus.PAID)) {
    throw new AppError(ErrorCode.PROGRESS_CLAIM_INVALID_STATUS_TRANSITION);
  }
  return db.progressClaim.update({ where: { id }, data: { status: ProgressClaimStatus.PAID, paidAt: new Date() } });
}

registerApprovalModule(ApprovalModule.PROGRESS_CLAIM, {
  async resolveApprovers() {
    // PROJECTS.PROGRESS_CLAIM.CERTIFY is Admin/Super-Admin only — the
    // certifier stands in for the contract's Superintending Officer and
    // must differ from whoever prepared the claim (enforced generically by
    // approval-service.ts: the requester can never decide their own request).
    return [{ stepOrder: 1, approverRole: UserRole.ADMIN }];
  },

  async onApproved(tx, request: ApprovalRequestSummary) {
    const payload = request.payload as { claimedAmount?: string } | null;
    await tx.progressClaim.update({
      where: { id: request.entityId },
      data: {
        status: ProgressClaimStatus.CERTIFIED,
        certifiedAmount: payload?.claimedAmount ? Number(payload.claimedAmount) : undefined,
      },
    });
  },

  async onRejected(tx, request: ApprovalRequestSummary) {
    await tx.progressClaim.update({
      where: { id: request.entityId },
      data: { status: ProgressClaimStatus.REJECTED },
    });
  },
});
