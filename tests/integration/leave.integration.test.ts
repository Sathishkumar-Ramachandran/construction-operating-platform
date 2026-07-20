import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/authorization/roles";
import { ErrorCode } from "@/lib/errors";
import { AttendanceSource } from "@/lib/hr/constants";
import { createEmployee } from "@/lib/services/employee-service";
import { createLeaveRequest, cancelLeaveRequest } from "@/lib/services/leave-service";
import { decideApprovalStep } from "@/lib/services/approval-service";
import { createActor, cleanupUserIds } from "@/tests/helpers/actors";
import {
  buildCreateEmployeeInput,
  createdEmployeeIds,
  createTestLeaveType,
  cleanupHrFixtures,
} from "@/tests/helpers/hr-fixtures";

const createdUserIds: string[] = [];

async function createLinkedEmployee(
  actorRole: UserRole,
  label: string,
  overrides: Parameters<typeof buildCreateEmployeeInput>[0] = {}
) {
  const actor = await createActor(actorRole, label);
  createdUserIds.push(actor.id);
  const employee = await createEmployee(actor, await buildCreateEmployeeInput(overrides));
  createdEmployeeIds.push(employee.id);
  await db.employee.update({ where: { id: employee.id }, data: { userId: actor.id } });
  return { actor, employee };
}

/** A Monday roughly `weeksAhead` weeks from now (UTC) — far enough in the
 * future to never collide with "today"-relative logic elsewhere, and
 * distinct per test group so overlap checks across different tests (which
 * use different employees anyway) stay easy to reason about. */
function mondayWeeksAhead(weeksAhead: number): Date {
  const now = new Date();
  const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  base.setUTCDate(base.getUTCDate() + weeksAhead * 7);
  const day = base.getUTCDay();
  const diffToMonday = (8 - day) % 7 || 7;
  base.setUTCDate(base.getUTCDate() + diffToMonday);
  return base;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

describe("leave-service (integration)", () => {
  afterAll(async () => {
    await cleanupHrFixtures();
    await cleanupUserIds(createdUserIds);
  });

  it("creates a PENDING request routed to the reporting manager, computing dayCount from working days", async () => {
    const { actor: managerActor, employee: managerEmployee } = await createLinkedEmployee(
      UserRole.MANAGER,
      "leave-manager-1"
    );
    const { actor: employeeActor, employee } = await createLinkedEmployee(
      UserRole.HR,
      "leave-employee-1",
      { reportingManagerId: managerEmployee.id }
    );
    const leaveType = await createTestLeaveType();

    const monday = mondayWeeksAhead(3);
    const friday = addDays(monday, 4);

    const request = await createLeaveRequest(employeeActor, {
      leaveTypeId: leaveType.id,
      startDate: isoDate(monday),
      endDate: isoDate(friday),
      startHalfDay: false,
      endHalfDay: false,
      reason: "Vitest leave request",
    });

    expect(request.status).toBe("PENDING");
    expect(Number(request.dayCount)).toBe(5);
    expect(request.approvalRequestId).not.toBeNull();

    const steps = await db.approvalStep.findMany({
      where: { approvalRequestId: request.approvalRequestId! },
    });
    expect(steps).toHaveLength(1);
    expect(steps[0].approverUserId).toBe(managerActor.id);

    expect(employee.id).toBe(request.employeeId);
  });

  it("rejects an overlapping request for the same employee", async () => {
    const { actor: managerActor, employee: managerEmployee } = await createLinkedEmployee(
      UserRole.MANAGER,
      "leave-manager-2"
    );
    const { actor: employeeActor } = await createLinkedEmployee(UserRole.HR, "leave-employee-2", {
      reportingManagerId: managerEmployee.id,
    });
    const leaveType = await createTestLeaveType();
    void managerActor;

    const monday = mondayWeeksAhead(4);
    const friday = addDays(monday, 4);

    await createLeaveRequest(employeeActor, {
      leaveTypeId: leaveType.id,
      startDate: isoDate(monday),
      endDate: isoDate(friday),
      startHalfDay: false,
      endHalfDay: false,
    });

    await expect(
      createLeaveRequest(employeeActor, {
        leaveTypeId: leaveType.id,
        startDate: isoDate(addDays(monday, 2)),
        endDate: isoDate(addDays(friday, 2)),
        startHalfDay: false,
        endHalfDay: false,
      })
    ).rejects.toMatchObject({ code: ErrorCode.LEAVE_OVERLAPPING_REQUEST });
  });

  it("rejects a request that exceeds the remaining balance for a paid leave type", async () => {
    const { employee: managerEmployee } = await createLinkedEmployee(UserRole.MANAGER, "leave-manager-3");
    const { actor: employeeActor } = await createLinkedEmployee(UserRole.HR, "leave-employee-3", {
      reportingManagerId: managerEmployee.id,
    });
    const leaveType = await createTestLeaveType({ defaultEntitlementDays: 1 });

    const monday = mondayWeeksAhead(5);
    const friday = addDays(monday, 4);

    await expect(
      createLeaveRequest(employeeActor, {
        leaveTypeId: leaveType.id,
        startDate: isoDate(monday),
        endDate: isoDate(friday),
        startHalfDay: false,
        endHalfDay: false,
      })
    ).rejects.toMatchObject({ code: ErrorCode.LEAVE_INSUFFICIENT_BALANCE });
  });

  it("does not balance-check an unpaid leave type", async () => {
    const { employee: managerEmployee } = await createLinkedEmployee(UserRole.MANAGER, "leave-manager-3b");
    const { actor: employeeActor } = await createLinkedEmployee(UserRole.HR, "leave-employee-3b", {
      reportingManagerId: managerEmployee.id,
    });
    const leaveType = await createTestLeaveType({ defaultEntitlementDays: 0, isPaid: false });

    const monday = mondayWeeksAhead(6);
    const friday = addDays(monday, 4);

    const request = await createLeaveRequest(employeeActor, {
      leaveTypeId: leaveType.id,
      startDate: isoDate(monday),
      endDate: isoDate(friday),
      startHalfDay: false,
      endHalfDay: false,
    });
    expect(request.status).toBe("PENDING");
  });

  it("approval flips status to APPROVED and writes ON_LEAVE AttendanceRecord rows for working days only", async () => {
    const { actor: managerActor, employee: managerEmployee } = await createLinkedEmployee(
      UserRole.MANAGER,
      "leave-manager-4"
    );
    const { actor: employeeActor, employee } = await createLinkedEmployee(
      UserRole.HR,
      "leave-employee-4",
      { reportingManagerId: managerEmployee.id }
    );
    const leaveType = await createTestLeaveType();

    // Saturday .. Monday — spans the Sunday off-day (DEFAULT_WORKING_WEEKDAYS
    // is Mon-Sat working, Sunday off), so approval should write ON_LEAVE for
    // Saturday and Monday but leave Sunday untouched.
    const monday = mondayWeeksAhead(7);
    const saturdayBefore = addDays(monday, -2);

    const request = await createLeaveRequest(employeeActor, {
      leaveTypeId: leaveType.id,
      startDate: isoDate(saturdayBefore),
      endDate: isoDate(monday),
      startHalfDay: false,
      endHalfDay: false,
    });
    expect(Number(request.dayCount)).toBe(2);

    const decided = await decideApprovalStep(managerActor, {
      approvalRequestId: request.approvalRequestId!,
      stepOrder: 1,
      decision: "APPROVED",
    });
    expect(decided.status).toBe("APPROVED");

    const updatedRequest = await db.leaveRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(updatedRequest.status).toBe("APPROVED");

    const records = await db.attendanceRecord.findMany({
      where: { employeeId: employee.id },
      orderBy: { date: "asc" },
    });
    expect(records).toHaveLength(2);
    expect(records.every((r) => r.status === "ON_LEAVE")).toBe(true);
    expect(records.every((r) => r.source === AttendanceSource.LEAVE)).toBe(true);

    const sundayBetween = addDays(saturdayBefore, 1);
    const sundayRecord = await db.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: sundayBetween } },
    });
    expect(sundayRecord).toBeNull();
  });

  it("rejection leaves Attendance untouched", async () => {
    const { actor: managerActor, employee: managerEmployee } = await createLinkedEmployee(
      UserRole.MANAGER,
      "leave-manager-5"
    );
    const { actor: employeeActor, employee } = await createLinkedEmployee(
      UserRole.HR,
      "leave-employee-5",
      { reportingManagerId: managerEmployee.id }
    );
    const leaveType = await createTestLeaveType();

    const monday = mondayWeeksAhead(8);
    const friday = addDays(monday, 4);

    const request = await createLeaveRequest(employeeActor, {
      leaveTypeId: leaveType.id,
      startDate: isoDate(monday),
      endDate: isoDate(friday),
      startHalfDay: false,
      endHalfDay: false,
    });

    await decideApprovalStep(managerActor, {
      approvalRequestId: request.approvalRequestId!,
      stepOrder: 1,
      decision: "REJECTED",
    });

    const updatedRequest = await db.leaveRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(updatedRequest.status).toBe("REJECTED");

    const records = await db.attendanceRecord.findMany({ where: { employeeId: employee.id } });
    expect(records).toHaveLength(0);
  });

  it("blocks self-approval even when resolved via the HR role-pool fallback", async () => {
    // No reporting manager → resolveApprovers falls back to the HR role pool.
    const { actor: hrRequesterActor } = await createLinkedEmployee(UserRole.HR, "leave-hr-requester");
    const leaveType = await createTestLeaveType();

    const monday = mondayWeeksAhead(9);
    const friday = addDays(monday, 4);

    const request = await createLeaveRequest(hrRequesterActor, {
      leaveTypeId: leaveType.id,
      startDate: isoDate(monday),
      endDate: isoDate(friday),
      startHalfDay: false,
      endHalfDay: false,
    });

    const step = await db.approvalStep.findFirstOrThrow({
      where: { approvalRequestId: request.approvalRequestId! },
    });
    expect(step.approverRole).toBe(UserRole.HR);

    await expect(
      decideApprovalStep(hrRequesterActor, {
        approvalRequestId: request.approvalRequestId!,
        stepOrder: 1,
        decision: "APPROVED",
      })
    ).rejects.toMatchObject({ code: ErrorCode.APPROVAL_NOT_AUTHORIZED_APPROVER });

    // A different HR user can still approve it.
    const otherHrActor = await createActor(UserRole.HR, "leave-hr-approver");
    createdUserIds.push(otherHrActor.id);
    const decided = await decideApprovalStep(otherHrActor, {
      approvalRequestId: request.approvalRequestId!,
      stepOrder: 1,
      decision: "APPROVED",
    });
    expect(decided.status).toBe("APPROVED");
  });

  it("cancellation only works while PENDING", async () => {
    const { actor: managerActor, employee: managerEmployee } = await createLinkedEmployee(
      UserRole.MANAGER,
      "leave-manager-6"
    );
    const { actor: employeeActor } = await createLinkedEmployee(UserRole.HR, "leave-employee-6", {
      reportingManagerId: managerEmployee.id,
    });
    const leaveType = await createTestLeaveType();

    const monday = mondayWeeksAhead(10);
    const friday = addDays(monday, 4);

    const request = await createLeaveRequest(employeeActor, {
      leaveTypeId: leaveType.id,
      startDate: isoDate(monday),
      endDate: isoDate(friday),
      startHalfDay: false,
      endHalfDay: false,
    });

    await decideApprovalStep(managerActor, {
      approvalRequestId: request.approvalRequestId!,
      stepOrder: 1,
      decision: "APPROVED",
    });

    await expect(cancelLeaveRequest(employeeActor, request.id)).rejects.toMatchObject({
      code: ErrorCode.LEAVE_REQUEST_NOT_CANCELLABLE,
    });

    // A fresh, still-pending request can be cancelled by the requester.
    const monday2 = mondayWeeksAhead(11);
    const friday2 = addDays(monday2, 4);
    const pendingRequest = await createLeaveRequest(employeeActor, {
      leaveTypeId: leaveType.id,
      startDate: isoDate(monday2),
      endDate: isoDate(friday2),
      startHalfDay: false,
      endHalfDay: false,
    });

    const cancelled = await cancelLeaveRequest(employeeActor, pendingRequest.id);
    expect(cancelled.status).toBe("CANCELLED");
  });
});
