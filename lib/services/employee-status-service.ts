import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import {
  EMPLOYMENT_STATUS_TRANSITIONS,
  type EmploymentStatus,
} from "@/lib/hr/constants";
import type { ChangeEmploymentStatusInput } from "@/lib/validation/employees";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

export function isTransitionAllowed(
  from: EmploymentStatus,
  to: EmploymentStatus
): boolean {
  if (from === to) return false;
  return EMPLOYMENT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Centralized employment-status transition. Never call
 * `db.employee.update({ data: { employmentStatus } })` directly outside
 * this service — every change must go through the allowed-transition table
 * and leave an EmployeeStatusHistory row.
 */
export async function changeEmploymentStatus(
  actor: AuthenticatedUser,
  input: ChangeEmploymentStatusInput,
  meta: ActorMeta = {}
) {
  const employee = await db.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true, employmentStatus: true, version: true },
  });
  if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);

  const currentStatus = employee.employmentStatus as EmploymentStatus;
  if (!isTransitionAllowed(currentStatus, input.newStatus)) {
    throw new AppError(ErrorCode.EMPLOYEE_INVALID_STATUS_TRANSITION);
  }

  const effectiveDate = new Date(input.effectiveDate);

  return db.$transaction(async (tx) => {
    const result = await tx.employee.updateMany({
      where: { id: input.employeeId, version: employee.version },
      data: {
        employmentStatus: input.newStatus,
        updatedBy: actor.id,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new AppError(
        ErrorCode.CONFLICT_ERROR,
        "This employee record was changed by someone else. Refresh and try again."
      );
    }

    await tx.employeeStatusHistory.create({
      data: {
        employeeId: input.employeeId,
        previousStatus: currentStatus,
        newStatus: input.newStatus,
        effectiveDate,
        reason: input.reason,
        notes: input.notes || null,
        createdBy: actor.id,
      },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.EMPLOYEE_STATUS_CHANGED,
      entityType: "Employee",
      entityId: input.employeeId,
      beforeData: { employmentStatus: currentStatus },
      afterData: { employmentStatus: input.newStatus },
      metadata: { reason: input.reason },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return tx.employee.findUniqueOrThrow({
      where: { id: input.employeeId },
      select: { id: true, employmentStatus: true, version: true },
    });
  });
}

export async function getStatusHistory(employeeId: string) {
  return db.employeeStatusHistory.findMany({
    where: { employeeId },
    orderBy: { createdAt: "desc" },
  });
}
