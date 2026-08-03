import type { Db } from "@/lib/db";
import type { UserRole } from "@/lib/authorization/roles";

/** Extensible string, same pattern as AuditAction/ErrorCode — add a new
 * module here (and register a handler in registerApprovalModule) whenever a
 * new part of the app needs an approve/reject flow. */
export const ApprovalModule = {
  LEAVE: "LEAVE",
  EQUIPMENT_REQUEST: "EQUIPMENT_REQUEST",
  PROJECT_STAGE_GATE: "PROJECT_STAGE_GATE",
  PAYROLL_RUN: "PAYROLL_RUN",
  PURCHASE_ORDER: "PURCHASE_ORDER",
  PROGRESS_CLAIM: "PROGRESS_CLAIM",
} as const;
export type ApprovalModule = (typeof ApprovalModule)[keyof typeof ApprovalModule];

export type ResolvedApprover = {
  stepOrder: number;
  approverUserId?: string;
  approverRole?: UserRole;
};

export type ApprovalRequestSummary = {
  id: string;
  module: string;
  entityType: string;
  entityId: string;
  payload: unknown;
  reason: string | null;
};

/**
 * Contract every module (Leave, Equipment requests, Project stage-gates, ...)
 * implements and registers itself under. approval-service.ts dispatches to
 * these handlers and never imports a specific module's own service —
 * keeps the engine generic. See docs on registerApprovalModule below.
 */
export type ApprovalModuleHandler = {
  /** Who must decide this request, in order. Called once, at creation. */
  resolveApprovers(
    entityId: string,
    payload: unknown
  ): Promise<ResolvedApprover[]>;
  /** Called inside the same transaction as the final approving decision. */
  onApproved(
    tx: Db,
    request: ApprovalRequestSummary
  ): Promise<void>;
  /** Called inside the same transaction as the final rejecting decision. */
  onRejected(
    tx: Db,
    request: ApprovalRequestSummary
  ): Promise<void>;
};

const registry = new Map<string, ApprovalModuleHandler>();

/** Modules call this once (e.g. at import time of their own service file)
 * to plug themselves into the generic approval engine. */
export function registerApprovalModule(
  module: ApprovalModule,
  handler: ApprovalModuleHandler
) {
  registry.set(module, handler);
}

export function getApprovalModuleHandler(
  module: string
): ApprovalModuleHandler | undefined {
  return registry.get(module);
}
