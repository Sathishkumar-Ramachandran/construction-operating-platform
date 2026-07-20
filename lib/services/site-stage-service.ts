import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import {
  LAST_SELF_ADVANCE_STAGE,
  ProjectStatus,
  SiteStage,
  SiteStageHistoryTrigger,
  isFinalSiteStage,
  nextSiteStage,
} from "@/lib/projects/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { getActorEmployeeId } from "@/lib/services/employee-service";
import { isActivelyAssignedToSite } from "@/lib/services/employee-allocation-service";
import { isChecklistComplete } from "@/lib/services/site-stage-checklist-service";
import { hasRole } from "@/lib/services/authorization-service";
import { UserRole } from "@/lib/authorization/roles";
import * as approvalService from "@/lib/services/approval-service";
import {
  ApprovalModule,
  registerApprovalModule,
  type ApprovalRequestSummary,
} from "@/lib/services/approval-registry";
import type { AdvanceSiteStageInput } from "@/lib/validation/site-stages";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

/** Relationship-scoped, not a permission code — Managers and Admins/Super
 * Admins may always advance; anyone else must have an active assignment to
 * this exact site (per the product decision that site workers, not just
 * managers, self-advance the stages they're actually doing the work on). */
export async function assertCanAdvanceSiteStage(
  actor: AuthenticatedUser,
  site: { id: string }
): Promise<void> {
  const isAdmin = await hasRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  if (isAdmin) return;
  if (actor.role === UserRole.MANAGER) return;

  const employeeId = await getActorEmployeeId(actor.id);
  if (!employeeId) throw new AppError(ErrorCode.SITE_STAGE_NOT_AUTHORIZED);

  const assigned = await isActivelyAssignedToSite(employeeId, site.id);
  if (!assigned) throw new AppError(ErrorCode.SITE_STAGE_NOT_AUTHORIZED);
}

export async function advanceSiteStage(
  actor: AuthenticatedUser,
  input: AdvanceSiteStageInput,
  meta: ActorMeta = {}
) {
  const site = await db.site.findUnique({
    where: { id: input.siteId },
    include: { project: { select: { id: true, status: true } } },
  });
  if (!site) throw new AppError(ErrorCode.SITE_NOT_FOUND);
  if (site.project.status !== ProjectStatus.ACTIVE) {
    throw new AppError(ErrorCode.PROJECT_NOT_ACTIVE);
  }

  await assertCanAdvanceSiteStage(actor, site);

  const currentStage = site.currentStage as SiteStage;
  if (isFinalSiteStage(currentStage)) {
    throw new AppError(ErrorCode.SITE_STAGE_ALREADY_COMPLETE);
  }

  if (site.handoverApprovalRequestId) {
    const pending = await db.approvalRequest.findUnique({
      where: { id: site.handoverApprovalRequestId },
      select: { status: true },
    });
    if (pending?.status === "PENDING") {
      throw new AppError(ErrorCode.SITE_STAGE_HANDOVER_ALREADY_PENDING);
    }
  }

  const next = nextSiteStage(currentStage);
  if (!next) throw new AppError(ErrorCode.SITE_STAGE_ALREADY_COMPLETE);

  if (!(await isChecklistComplete(site.id, currentStage))) {
    throw new AppError(ErrorCode.SITE_STAGE_CHECKLIST_INCOMPLETE);
  }

  const notes = input.notes || null;

  if (currentStage !== LAST_SELF_ADVANCE_STAGE) {
    return db.$transaction(async (tx) => {
      const updated = await tx.site.update({
        where: { id: site.id },
        data: { currentStage: next, currentStageStartedAt: new Date() },
      });

      await tx.siteStageHistory.create({
        data: {
          siteId: site.id,
          previousStage: currentStage,
          newStage: next,
          trigger: SiteStageHistoryTrigger.SELF_ADVANCE,
          notes,
          changedBy: actor.id,
        },
      });

      await recordAuditLog(tx, {
        userId: actor.id,
        action: AuditAction.SITE_STAGE_ADVANCED,
        entityType: "Site",
        entityId: site.id,
        beforeData: { stage: currentStage },
        afterData: { stage: next },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });

      return updated;
    });
  }

  // 7 -> 8 (Handover & Documentation) requires Admin approval. Not nested in
  // a transaction — createApprovalRequest manages its own, same two-phase
  // shape as leave-service.ts's createLeaveRequest.
  const employeeId = await getActorEmployeeId(actor.id);
  const approvalRequest = await approvalService.createApprovalRequest(
    actor,
    {
      module: ApprovalModule.PROJECT_STAGE_GATE,
      entityType: "Site",
      entityId: site.id,
      payload: { fromStage: currentStage, toStage: next },
      reason: `Handover approval for site ${site.name}`,
      requestedByEmployeeId: employeeId,
    },
    meta
  );

  return db.$transaction(async (tx) => {
    const updated = await tx.site.update({
      where: { id: site.id },
      data: { handoverApprovalRequestId: approvalRequest.id },
    });

    await tx.siteStageHistory.create({
      data: {
        siteId: site.id,
        previousStage: currentStage,
        newStage: currentStage,
        trigger: SiteStageHistoryTrigger.HANDOVER_SUBMITTED,
        notes,
        changedBy: actor.id,
        approvalRequestId: approvalRequest.id,
      },
    });

    return updated;
  });
}

// --- Approval Engine registration ------------------------------------------

registerApprovalModule(ApprovalModule.PROJECT_STAGE_GATE, {
  async resolveApprovers() {
    return [{ stepOrder: 1, approverRole: UserRole.ADMIN }];
  },

  async onApproved(tx, request: ApprovalRequestSummary) {
    const site = await tx.site.findUniqueOrThrow({ where: { id: request.entityId } });
    const currentStage = site.currentStage as SiteStage;
    if (isFinalSiteStage(currentStage)) return; // already handled (defensive against drift)

    const next = nextSiteStage(currentStage);
    if (!next) return;

    await tx.site.update({
      where: { id: site.id },
      data: { currentStage: next, currentStageStartedAt: new Date() },
    });

    await tx.siteStageHistory.create({
      data: {
        siteId: site.id,
        previousStage: currentStage,
        newStage: next,
        trigger: SiteStageHistoryTrigger.HANDOVER_APPROVED,
        approvalRequestId: request.id,
      },
    });
  },

  async onRejected(tx, request: ApprovalRequestSummary) {
    const site = await tx.site.findUniqueOrThrow({ where: { id: request.entityId } });

    await tx.siteStageHistory.create({
      data: {
        siteId: site.id,
        previousStage: site.currentStage,
        newStage: site.currentStage,
        trigger: SiteStageHistoryTrigger.HANDOVER_REJECTED,
        notes: request.reason,
        approvalRequestId: request.id,
      },
    });
    // Site.currentStage intentionally unchanged — stays at
    // CLEANING_DISMANTLING so the assignee can fix issues and resubmit via
    // advanceSiteStage again.
  },
});
