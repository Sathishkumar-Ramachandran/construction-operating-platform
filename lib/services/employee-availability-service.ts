import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import {
  AssignmentStatus,
  INACTIVE_EMPLOYMENT_STATUSES,
  WorkforceAvailability,
  EmploymentStatus,
} from "@/lib/hr/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import type { AvailabilityOverrideInput } from "@/lib/validation/allocation";
import type { AuthenticatedUser } from "@/types/auth";

export type AvailabilityInputs = {
  employmentStatus: string;
  isOnApprovedLeaveToday: boolean;
  activeAllocationPercentage: number;
  override: { status: WorkforceAvailability; effectiveFrom: Date; effectiveUntil: Date | null } | null;
};

/**
 * Pure decision-tree implementation of spec 4.4. No DB access — fully unit
 * testable. Called by `getWorkforceAvailability` after gathering inputs.
 */
export function deriveWorkforceAvailability(
  inputs: AvailabilityInputs
): WorkforceAvailability {
  const { override } = inputs;
  if (override) {
    const now = new Date();
    const isCurrent =
      override.effectiveFrom <= now &&
      (!override.effectiveUntil || override.effectiveUntil >= now);
    if (isCurrent) return override.status;
  }

  if (INACTIVE_EMPLOYMENT_STATUSES.includes(inputs.employmentStatus as EmploymentStatus)) {
    return WorkforceAvailability.INACTIVE;
  }

  if (inputs.isOnApprovedLeaveToday) {
    return WorkforceAvailability.ON_LEAVE;
  }

  if (inputs.activeAllocationPercentage >= 100) {
    return WorkforceAvailability.IN_PROJECT;
  }

  if (inputs.activeAllocationPercentage > 0) {
    return WorkforceAvailability.PARTIALLY_ALLOCATED;
  }

  return WorkforceAvailability.FREE;
}

/**
 * Gathers live inputs for one employee and derives their current
 * availability. Leave data isn't modeled yet in this phase, so
 * `isOnApprovedLeaveToday` is always false — documented limitation.
 */
export async function getWorkforceAvailability(
  employeeId: string
): Promise<WorkforceAvailability> {
  const [employee, activeAssignments, override] = await Promise.all([
    db.employee.findUnique({
      where: { id: employeeId },
      select: { employmentStatus: true },
    }),
    db.employeeProjectAssignment.findMany({
      where: { employeeId, status: AssignmentStatus.ACTIVE },
      select: { allocationPercentage: true },
    }),
    db.employeeAvailabilityOverride.findFirst({
      where: { employeeId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);

  const activeAllocationPercentage = activeAssignments.reduce(
    (sum, a) => sum + a.allocationPercentage,
    0
  );

  return deriveWorkforceAvailability({
    employmentStatus: employee.employmentStatus,
    isOnApprovedLeaveToday: false,
    activeAllocationPercentage,
    override: override
      ? {
          status: override.status as WorkforceAvailability,
          effectiveFrom: override.effectiveFrom,
          effectiveUntil: override.effectiveUntil,
        }
      : null,
  });
}

/** Batch variant for directory/availability list views — avoids N+1. */
export async function getWorkforceAvailabilityBatch(
  employeeIds: string[]
): Promise<Map<string, WorkforceAvailability>> {
  if (employeeIds.length === 0) return new Map();

  const [employees, assignments, overrides] = await Promise.all([
    db.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, employmentStatus: true },
    }),
    db.employeeProjectAssignment.findMany({
      where: { employeeId: { in: employeeIds }, status: AssignmentStatus.ACTIVE },
      select: { employeeId: true, allocationPercentage: true },
    }),
    db.employeeAvailabilityOverride.findMany({
      where: { employeeId: { in: employeeIds } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const allocationByEmployee = new Map<string, number>();
  for (const a of assignments) {
    allocationByEmployee.set(
      a.employeeId,
      (allocationByEmployee.get(a.employeeId) ?? 0) + a.allocationPercentage
    );
  }

  const overrideByEmployee = new Map<string, (typeof overrides)[number]>();
  for (const o of overrides) {
    if (!overrideByEmployee.has(o.employeeId)) overrideByEmployee.set(o.employeeId, o);
  }

  const result = new Map<string, WorkforceAvailability>();
  for (const employee of employees) {
    const override = overrideByEmployee.get(employee.id);
    result.set(
      employee.id,
      deriveWorkforceAvailability({
        employmentStatus: employee.employmentStatus,
        isOnApprovedLeaveToday: false,
        activeAllocationPercentage: allocationByEmployee.get(employee.id) ?? 0,
        override: override
          ? {
              status: override.status as WorkforceAvailability,
              effectiveFrom: override.effectiveFrom,
              effectiveUntil: override.effectiveUntil,
            }
          : null,
      })
    );
  }
  return result;
}

export async function setAvailabilityOverride(
  actor: AuthenticatedUser,
  input: AvailabilityOverrideInput
) {
  const employee = await db.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true },
  });
  if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);

  const override = await db.employeeAvailabilityOverride.create({
    data: {
      employeeId: input.employeeId,
      status: input.status,
      reason: input.reason,
      effectiveFrom: new Date(input.effectiveFrom),
      effectiveUntil: input.effectiveUntil ? new Date(input.effectiveUntil) : null,
      createdBy: actor.id,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.AVAILABILITY_OVERRIDE_SET,
    entityType: "Employee",
    entityId: input.employeeId,
    afterData: { status: input.status, reason: input.reason },
  });

  return override;
}
