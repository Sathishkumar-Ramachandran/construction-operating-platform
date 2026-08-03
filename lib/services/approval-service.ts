import { db, type Db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { getApprovalModuleHandler } from "@/lib/services/approval-registry";
import { hasRole } from "@/lib/services/authorization-service";
import { UserRole } from "@/lib/authorization/roles";
import type {
  DecideApprovalInput,
  CancelApprovalInput,
  ListApprovalsQuery,
} from "@/lib/validation/approvals";
import type { AuthenticatedUser } from "@/types/auth";
import type { Prisma } from "@/generated/prisma/client";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

async function notifyUsers(
  tx: Db,
  input: {
    userIds: string[];
    type: string;
    title: string;
    body: string;
    entityType?: string;
    entityId?: string;
  }
) {
  const uniqueUserIds = [...new Set(input.userIds)];
  if (uniqueUserIds.length === 0) return;

  await tx.notification.createMany({
    data: uniqueUserIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    })),
  });
}

/**
 * Creates an approval request for `entityId` in `module` and materializes
 * its step chain via that module's registered handler. Modules call this
 * from their own service (e.g. LeaveRequest creation) rather than writing
 * their own approve/reject state machine — see lib/services/approval-registry.ts.
 */
export async function createApprovalRequest(
  actor: AuthenticatedUser,
  input: {
    module: string;
    entityType: string;
    entityId: string;
    payload: unknown;
    reason?: string | null;
    requestedByEmployeeId?: string | null;
  },
  meta: ActorMeta = {}
) {
  const handler = getApprovalModuleHandler(input.module);
  if (!handler) throw new AppError(ErrorCode.APPROVAL_UNKNOWN_MODULE);

  const approvers = await handler.resolveApprovers(input.entityId, input.payload);
  if (approvers.length === 0) {
    throw new AppError(ErrorCode.APPROVAL_NO_APPROVERS_RESOLVED);
  }

  return db.$transaction(async (tx) => {
    const request = await tx.approvalRequest.create({
      data: {
        module: input.module,
        entityType: input.entityType,
        entityId: input.entityId,
        requestedBy: actor.id,
        requestedByEmployeeId: input.requestedByEmployeeId ?? null,
        payload: input.payload as Prisma.InputJsonValue,
        reason: input.reason ?? null,
        currentStepOrder: Math.min(...approvers.map((a) => a.stepOrder)),
        steps: {
          create: approvers.map((approver) => ({
            stepOrder: approver.stepOrder,
            approverUserId: approver.approverUserId ?? null,
            approverRole: approver.approverRole ?? null,
          })),
        },
      },
      include: { steps: true },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.APPROVAL_REQUEST_CREATED,
      entityType: "ApprovalRequest",
      entityId: request.id,
      afterData: { module: input.module, entityType: input.entityType, entityId: input.entityId },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return request;
  });
}

async function assertCanDecideStep(
  actor: AuthenticatedUser,
  step: { approverUserId: string | null; approverRole: string | null }
) {
  if (step.approverUserId && step.approverUserId === actor.id) return;
  if (step.approverRole && (await hasRole(actor, [step.approverRole as UserRole]))) return;
  throw new AppError(ErrorCode.APPROVAL_NOT_AUTHORIZED_APPROVER);
}

/**
 * Records a decision on the current step of an approval request. On the
 * request's final step, dispatches to the owning module's onApproved/
 * onRejected handler (in the same transaction) and notifies the requester.
 */
export async function decideApprovalStep(
  actor: AuthenticatedUser,
  input: DecideApprovalInput,
  meta: ActorMeta = {}
) {
  const request = await db.approvalRequest.findUnique({
    where: { id: input.approvalRequestId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
  });
  if (!request) throw new AppError(ErrorCode.APPROVAL_NOT_FOUND);
  if (request.status !== "PENDING") {
    throw new AppError(ErrorCode.APPROVAL_ALREADY_DECIDED);
  }
  if (input.stepOrder !== request.currentStepOrder) {
    throw new AppError(ErrorCode.APPROVAL_INVALID_STEP_ORDER);
  }

  const step = request.steps.find((s) => s.stepOrder === input.stepOrder);
  if (!step || step.status !== "PENDING") {
    throw new AppError(ErrorCode.APPROVAL_INVALID_STEP_ORDER);
  }

  // Nobody decides their own request — matters most when resolveApprovers
  // fell back to a role pool (e.g. any HR.LEAVE.MANAGE holder) rather than a
  // specific approverUserId, since the requester themselves may hold that role.
  if (request.requestedBy === actor.id) {
    throw new AppError(ErrorCode.APPROVAL_NOT_AUTHORIZED_APPROVER);
  }

  await assertCanDecideStep(actor, step);

  const handler = getApprovalModuleHandler(request.module);
  if (!handler) throw new AppError(ErrorCode.APPROVAL_UNKNOWN_MODULE);

  const isRejection = input.decision === "REJECTED";
  const remainingSteps = request.steps.filter(
    (s) => s.stepOrder > input.stepOrder && s.status === "PENDING"
  );
  const isFinalDecision = isRejection || remainingSteps.length === 0;

  return db.$transaction(async (tx) => {
    const stepUpdate = await tx.approvalStep.updateMany({
      where: { id: step.id, status: "PENDING" },
      data: {
        status: input.decision,
        decisionNotes: input.notes || null,
        decidedBy: actor.id,
        decidedAt: new Date(),
      },
    });
    if (stepUpdate.count === 0) {
      throw new AppError(ErrorCode.APPROVAL_ALREADY_DECIDED);
    }

    let updatedRequest = request;
    if (isFinalDecision) {
      const finalStatus = isRejection ? "REJECTED" : "APPROVED";
      const requestUpdate = await tx.approvalRequest.updateMany({
        where: { id: request.id, version: request.version, status: "PENDING" },
        data: { status: finalStatus, version: { increment: 1 } },
      });
      if (requestUpdate.count === 0) {
        throw new AppError(ErrorCode.APPROVAL_ALREADY_DECIDED);
      }
      updatedRequest = { ...request, status: finalStatus };

      const summary = {
        id: request.id,
        module: request.module,
        entityType: request.entityType,
        entityId: request.entityId,
        payload: request.payload,
        reason: request.reason,
      };
      if (isRejection) {
        await handler.onRejected(tx, summary);
      } else {
        await handler.onApproved(tx, summary);
      }

      await notifyUsers(tx, {
        userIds: [request.requestedBy],
        type: "APPROVAL_DECIDED",
        title: isRejection ? "Your request was rejected" : "Your request was approved",
        body: `${request.entityType} request (${request.module}) was ${finalStatus.toLowerCase()}.`,
        entityType: request.entityType,
        entityId: request.entityId,
      });
    } else {
      const nextStepOrder = Math.min(...remainingSteps.map((s) => s.stepOrder));
      await tx.approvalRequest.updateMany({
        where: { id: request.id, version: request.version },
        data: { currentStepOrder: nextStepOrder, version: { increment: 1 } },
      });
    }

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.APPROVAL_STEP_DECIDED,
      entityType: "ApprovalRequest",
      entityId: request.id,
      afterData: { stepOrder: input.stepOrder, decision: input.decision },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    if (isFinalDecision) {
      await recordAuditLog(tx, {
        userId: actor.id,
        action: isRejection
          ? AuditAction.APPROVAL_REQUEST_REJECTED
          : AuditAction.APPROVAL_REQUEST_APPROVED,
        entityType: "ApprovalRequest",
        entityId: request.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }

    return updatedRequest;
  });
}

/** Requester (or an Admin/Super Admin) withdraws a still-pending request. */
export async function cancelApprovalRequest(
  actor: AuthenticatedUser,
  input: CancelApprovalInput,
  meta: ActorMeta = {}
) {
  const request = await db.approvalRequest.findUnique({
    where: { id: input.approvalRequestId },
  });
  if (!request) throw new AppError(ErrorCode.APPROVAL_NOT_FOUND);
  if (request.status !== "PENDING") {
    throw new AppError(ErrorCode.APPROVAL_ALREADY_DECIDED);
  }

  const isRequester = request.requestedBy === actor.id;
  const isAdmin = await hasRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  if (!isRequester && !isAdmin) {
    throw new AppError(ErrorCode.APPROVAL_NOT_AUTHORIZED_APPROVER);
  }

  return db.$transaction(async (tx) => {
    const result = await tx.approvalRequest.updateMany({
      where: { id: request.id, version: request.version, status: "PENDING" },
      data: { status: "CANCELLED", version: { increment: 1 } },
    });
    if (result.count === 0) throw new AppError(ErrorCode.APPROVAL_ALREADY_DECIDED);

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.APPROVAL_REQUEST_CANCELLED,
      entityType: "ApprovalRequest",
      entityId: request.id,
      afterData: { reason: input.reason ?? null },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return { ...request, status: "CANCELLED" as const };
  });
}

/** Powers the /approvals inbox: requests pending a decision from the actor,
 * or requests the actor themselves filed. */
export async function listApprovalsForActor(
  actor: AuthenticatedUser,
  query: ListApprovalsQuery
) {
  const where =
    query.scope === "REQUESTED_BY_ME"
      ? { requestedBy: actor.id }
      : {
          status: "PENDING",
          steps: {
            some: {
              status: "PENDING",
              OR: [{ approverUserId: actor.id }, { approverRole: actor.role }],
            },
          },
        };

  const [total, requests] = await Promise.all([
    db.approvalRequest.count({ where }),
    db.approvalRequest.findMany({
      where,
      include: { steps: { orderBy: { stepOrder: "asc" } } },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { requests, total, page: query.page, pageSize: query.pageSize };
}

export async function getApprovalHistoryForEntity(
  module: string,
  entityType: string,
  entityId: string
) {
  return db.approvalRequest.findMany({
    where: { module, entityType, entityId },
    include: { steps: { orderBy: { stepOrder: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
}
