import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { EmploymentStatus, INACTIVE_EMPLOYMENT_STATUSES } from "@/lib/hr/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { revokeAllSessions } from "@/lib/services/password-reset-service";
import { closeAllActiveAssignments } from "@/lib/services/employee-allocation-service";
import type { OffboardEmployeeInput } from "@/lib/validation/employees";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

const TRIGGER_TO_STATUS: Record<
  OffboardEmployeeInput["triggerCategory"],
  typeof EmploymentStatus.RESIGNED | typeof EmploymentStatus.TERMINATED | typeof EmploymentStatus.RETIRED
> = {
  RESIGNATION: EmploymentStatus.RESIGNED,
  RETIREMENT: EmploymentStatus.RETIRED,
  TERMINATION: EmploymentStatus.TERMINATED,
  CONTRACT_COMPLETION: EmploymentStatus.TERMINATED,
  ABSCONDING: EmploymentStatus.TERMINATED,
  OTHER: EmploymentStatus.TERMINATED,
};

export type OffboardResult = {
  employeeId: string;
  assignmentsClosed: number;
  userDeactivated: boolean;
  sessionsRevoked: number;
};

/**
 * Simplified offboarding action (spec 5.4, without the full
 * template/checklist engine): transitions the employee to OFFBOARDED,
 * closes active project assignments, deactivates and signs the linked user
 * out everywhere, and records history + audit — all in one transaction.
 */
export async function offboardEmployee(
  actor: AuthenticatedUser,
  input: OffboardEmployeeInput,
  meta: ActorMeta = {}
): Promise<OffboardResult> {
  const employee = await db.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true, employmentStatus: true, version: true, userId: true },
  });
  if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);
  if (INACTIVE_EMPLOYMENT_STATUSES.includes(employee.employmentStatus as EmploymentStatus)) {
    throw new AppError(
      ErrorCode.EMPLOYEE_INVALID_STATUS_TRANSITION,
      "This employee has already been offboarded."
    );
  }

  const intermediateStatus = TRIGGER_TO_STATUS[input.triggerCategory];
  const lastWorkingDate = new Date(input.lastWorkingDate);
  const effectiveNow = new Date();

  return db.$transaction(async (tx) => {
    const result = await tx.employee.updateMany({
      where: { id: input.employeeId, version: employee.version },
      data: {
        employmentStatus: EmploymentStatus.OFFBOARDED,
        lastWorkingDate,
        terminationDate: lastWorkingDate,
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

    await tx.employeeStatusHistory.createMany({
      data: [
        {
          employeeId: input.employeeId,
          previousStatus: employee.employmentStatus,
          newStatus: intermediateStatus,
          effectiveDate: lastWorkingDate,
          reason: input.reason,
          notes: `Offboarding trigger: ${input.triggerCategory}`,
          createdBy: actor.id,
        },
        {
          employeeId: input.employeeId,
          previousStatus: intermediateStatus,
          newStatus: EmploymentStatus.OFFBOARDED,
          effectiveDate: effectiveNow,
          reason: input.reason,
          notes: input.rehireEligible ? "Rehire eligible" : "Not eligible for rehire",
          createdBy: actor.id,
        },
      ],
    });

    const assignmentsClosed = await closeAllActiveAssignments(tx, input.employeeId);

    let sessionsRevoked = 0;
    let userDeactivated = false;
    if (employee.userId) {
      await tx.user.update({
        where: { id: employee.userId },
        data: { isActive: false, updatedBy: actor.id, version: { increment: 1 } },
      });
      sessionsRevoked = await revokeAllSessions(employee.userId, tx);
      userDeactivated = true;
    }

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.EMPLOYEE_OFFBOARDED,
      entityType: "Employee",
      entityId: input.employeeId,
      metadata: {
        triggerCategory: input.triggerCategory,
        reason: input.reason,
        assignmentsClosed,
        userDeactivated,
        sessionsRevoked,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return {
      employeeId: input.employeeId,
      assignmentsClosed,
      userDeactivated,
      sessionsRevoked,
    };
  });
}
