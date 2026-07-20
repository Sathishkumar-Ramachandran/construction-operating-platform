import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import {
  AttendanceSource,
  DEFAULT_WORKING_WEEKDAYS,
} from "@/lib/hr/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { getActorEmployeeId } from "@/lib/services/employee-service";
import { isInReportingChain } from "@/lib/services/org-hierarchy-service";
import { hasPermission } from "@/lib/services/authorization-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import * as approvalService from "@/lib/services/approval-service";
import {
  ApprovalModule,
  registerApprovalModule,
  type ApprovalRequestSummary,
} from "@/lib/services/approval-registry";
import type {
  CreateLeaveRequestInput,
  AdjustLeaveBalanceInput,
  ListLeaveRequestsQuery,
} from "@/lib/validation/leave";
import type { AuthenticatedUser } from "@/types/auth";
import type { Prisma } from "@/generated/prisma/client";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

/** Same UTC-normalization convention as attendance-service.ts's startOfDay —
 * date-only strings parse as UTC midnight, so every day-boundary computation
 * here must stay UTC-consistent, not mixed local/UTC. */
function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type ComputeLeaveDayCountInput = {
  startDate: Date;
  endDate: Date;
  startHalfDay: boolean;
  endHalfDay: boolean;
  workingWeekdays: number[];
  holidayDates: Set<string>;
};

/**
 * Pure, zero-DB decision function — mirrors deriveAttendanceStatus's
 * pure/wrapper split. Counts 1 per working day (weekday in workingWeekdays
 * AND not a holiday) between startDate/endDate inclusive, with -0.5 applied
 * to the first/last working day when flagged half-day. Non-working days
 * (weekends/holidays) inside the range are never counted, matching normal
 * leave-balance-deduction practice.
 */
export function computeLeaveDayCount(input: ComputeLeaveDayCountInput): number {
  let total = 0;
  const workingDayKeys: string[] = [];

  for (
    let cursor = new Date(input.startDate);
    cursor <= input.endDate;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const key = dateKey(cursor);
    const isWorkingWeekday = input.workingWeekdays.includes(cursor.getUTCDay());
    if (isWorkingWeekday && !input.holidayDates.has(key)) {
      workingDayKeys.push(key);
      total += 1;
    }
  }

  if (workingDayKeys.length === 0) return 0;

  const startKey = dateKey(input.startDate);
  const endKey = dateKey(input.endDate);
  if (input.startHalfDay && workingDayKeys.includes(startKey)) total -= 0.5;
  // Avoid double-subtracting when the request is a single working day
  // flagged half-day on both ends (e.g. a single AM-only day).
  if (input.endHalfDay && workingDayKeys.includes(endKey) && endKey !== startKey) total -= 0.5;
  else if (input.endHalfDay && endKey === startKey && !input.startHalfDay) total -= 0.5;

  return Math.max(0, total);
}

async function assertCanViewEmployeeLeave(
  actor: AuthenticatedUser,
  employeeId: string
): Promise<void> {
  if (actor.role === UserRole.SUPER_ADMIN) return;

  const actorEmployeeId = await getActorEmployeeId(actor.id);
  if (actorEmployeeId === employeeId) return;

  const canManage = await hasPermission(actor, PERMISSIONS.HR_LEAVE_MANAGE.code);
  if (canManage) return;

  const canView = await hasPermission(actor, PERMISSIONS.HR_LEAVE_VIEW.code);
  if (!canView) throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);

  if (actor.role === UserRole.MANAGER) {
    if (!actorEmployeeId) throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);
    const managesTarget = await isInReportingChain(employeeId, actorEmployeeId);
    if (!managesTarget) throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);
    return;
  }

  throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);
}

async function getHolidayDatesInRange(from: Date, to: Date): Promise<Set<string>> {
  const holidays = await db.holiday.findMany({ where: { date: { gte: from, lte: to } } });
  return new Set(holidays.map((h) => dateKey(h.date)));
}

export async function getOrCreateLeaveBalance(
  client: Prisma.TransactionClient | typeof db,
  employeeId: string,
  leaveTypeId: string,
  year: number
) {
  const existing = await client.leaveBalance.findUnique({
    where: { employeeId_leaveTypeId_year: { employeeId, leaveTypeId, year } },
  });
  if (existing) return existing;

  const leaveType = await client.leaveType.findUniqueOrThrow({ where: { id: leaveTypeId } });
  return client.leaveBalance.create({
    data: {
      employeeId,
      leaveTypeId,
      year,
      entitledDays: leaveType.defaultEntitlementDays,
      carriedForwardDays: 0,
    },
  });
}

export async function getLeaveBalanceSummary(employeeId: string, leaveTypeId: string, year: number) {
  const [balance, usedAgg] = await Promise.all([
    getOrCreateLeaveBalance(db, employeeId, leaveTypeId, year),
    db.leaveRequest.aggregate({
      where: {
        employeeId,
        leaveTypeId,
        status: "APPROVED",
        startDate: { gte: new Date(Date.UTC(year, 0, 1)) },
        endDate: { lte: new Date(Date.UTC(year, 11, 31)) },
      },
      _sum: { dayCount: true },
    }),
  ]);

  const entitled = Number(balance.entitledDays);
  const carriedForward = Number(balance.carriedForwardDays);
  const used = Number(usedAgg._sum.dayCount ?? 0);
  return { entitled, carriedForward, used, remaining: entitled + carriedForward - used };
}

export async function listLeaveBalancesForEmployee(employeeId: string, year: number) {
  const leaveTypes = await db.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return Promise.all(
    leaveTypes.map(async (leaveType) => ({
      leaveType,
      ...(await getLeaveBalanceSummary(employeeId, leaveType.id, year)),
    }))
  );
}

export async function listLeaveRequestsForActor(
  actor: AuthenticatedUser,
  query: ListLeaveRequestsQuery
) {
  const actorEmployeeId = await getActorEmployeeId(actor.id);
  const canManage =
    actor.role === UserRole.SUPER_ADMIN ||
    (await hasPermission(actor, PERMISSIONS.HR_LEAVE_MANAGE.code));

  let employeeScopeIds: string[] | undefined;
  if (query.employeeId) {
    await assertCanViewEmployeeLeave(actor, query.employeeId);
    employeeScopeIds = [query.employeeId];
  } else if (canManage) {
    employeeScopeIds = undefined; // full visibility
  } else if (actor.role === UserRole.MANAGER && actorEmployeeId) {
    const reports = await db.employee.findMany({
      where: { reportingManagerId: actorEmployeeId },
      select: { id: true },
    });
    employeeScopeIds = [actorEmployeeId, ...reports.map((r) => r.id)];
  } else {
    if (!actorEmployeeId) return { requests: [], total: 0, page: query.page, pageSize: query.pageSize };
    employeeScopeIds = [actorEmployeeId];
  }

  const where: Prisma.LeaveRequestWhereInput = {
    ...(employeeScopeIds ? { employeeId: { in: employeeScopeIds } } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [total, requests] = await Promise.all([
    db.leaveRequest.count({ where }),
    db.leaveRequest.findMany({
      where,
      include: {
        leaveType: { select: { id: true, name: true, isPaid: true } },
        employee: { select: { id: true, firstName: true, lastName: true, preferredName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { requests, total, page: query.page, pageSize: query.pageSize };
}

export async function createLeaveRequest(
  actor: AuthenticatedUser,
  input: CreateLeaveRequestInput,
  meta: ActorMeta = {}
) {
  const employeeId = await getActorEmployeeId(actor.id);
  if (!employeeId) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);

  const leaveType = await db.leaveType.findUnique({ where: { id: input.leaveTypeId } });
  if (!leaveType || !leaveType.isActive) throw new AppError(ErrorCode.NOT_FOUND);

  const startDate = startOfDay(new Date(input.startDate));
  const endDate = startOfDay(new Date(input.endDate));
  if (endDate < startDate) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "End date cannot be before start date.");
  }

  const overlapping = await db.leaveRequest.findFirst({
    where: {
      employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
  if (overlapping) throw new AppError(ErrorCode.LEAVE_OVERLAPPING_REQUEST);

  const holidayDates = await getHolidayDatesInRange(startDate, endDate);
  const dayCount = computeLeaveDayCount({
    startDate,
    endDate,
    startHalfDay: input.startHalfDay,
    endHalfDay: input.endHalfDay,
    workingWeekdays: DEFAULT_WORKING_WEEKDAYS,
    holidayDates,
  });

  if (leaveType.isPaid) {
    const year = startDate.getUTCFullYear();
    const { remaining } = await getLeaveBalanceSummary(employeeId, leaveType.id, year);
    if (dayCount > remaining) throw new AppError(ErrorCode.LEAVE_INSUFFICIENT_BALANCE);
  }

  const leaveRequest = await db.leaveRequest.create({
    data: {
      employeeId,
      leaveTypeId: leaveType.id,
      startDate,
      endDate,
      startHalfDay: input.startHalfDay,
      endHalfDay: input.endHalfDay,
      dayCount,
      reason: input.reason || null,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.LEAVE_REQUEST_CREATED,
    entityType: "LeaveRequest",
    entityId: leaveRequest.id,
    afterData: { leaveTypeId: leaveType.id, startDate: input.startDate, endDate: input.endDate, dayCount },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  const approvalRequest = await approvalService.createApprovalRequest(
    actor,
    {
      module: ApprovalModule.LEAVE,
      entityType: "LeaveRequest",
      entityId: leaveRequest.id,
      payload: { leaveTypeId: leaveType.id, startDate: input.startDate, endDate: input.endDate, dayCount },
      reason: input.reason || null,
      requestedByEmployeeId: employeeId,
    },
    meta
  );

  return db.leaveRequest.update({
    where: { id: leaveRequest.id },
    data: { approvalRequestId: approvalRequest.id },
  });
}

export async function cancelLeaveRequest(actor: AuthenticatedUser, id: string, meta: ActorMeta = {}) {
  const leaveRequest = await db.leaveRequest.findUnique({ where: { id } });
  if (!leaveRequest) throw new AppError(ErrorCode.LEAVE_REQUEST_NOT_FOUND);

  const actorEmployeeId = await getActorEmployeeId(actor.id);
  const isSelf = actorEmployeeId === leaveRequest.employeeId;
  if (!isSelf) {
    const canManage = await hasPermission(actor, PERMISSIONS.HR_LEAVE_MANAGE.code);
    if (!canManage) throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);
  }

  if (leaveRequest.status !== "PENDING") {
    throw new AppError(ErrorCode.LEAVE_REQUEST_NOT_CANCELLABLE);
  }

  if (leaveRequest.approvalRequestId) {
    await approvalService.cancelApprovalRequest(
      actor,
      { approvalRequestId: leaveRequest.approvalRequestId, reason: "Leave request cancelled by requester." },
      meta
    );
  }

  const updated = await db.leaveRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.LEAVE_REQUEST_CANCELLED,
    entityType: "LeaveRequest",
    entityId: id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}

export async function adjustLeaveBalance(
  actor: AuthenticatedUser,
  input: AdjustLeaveBalanceInput,
  meta: ActorMeta = {}
) {
  const existing = await getOrCreateLeaveBalance(db, input.employeeId, input.leaveTypeId, input.year);

  const updated = await db.leaveBalance.update({
    where: { id: existing.id },
    data: {
      entitledDays: input.entitledDays,
      carriedForwardDays: input.carriedForwardDays,
      updatedBy: actor.id,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.LEAVE_BALANCE_ADJUSTED,
    entityType: "LeaveBalance",
    entityId: updated.id,
    beforeData: { entitledDays: Number(existing.entitledDays), carriedForwardDays: Number(existing.carriedForwardDays) },
    afterData: { entitledDays: input.entitledDays, carriedForwardDays: input.carriedForwardDays, reason: input.reason },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}

// --- Approval Engine registration ------------------------------------------

registerApprovalModule(ApprovalModule.LEAVE, {
  async resolveApprovers(entityId) {
    const leaveRequest = await db.leaveRequest.findUnique({
      where: { id: entityId },
      select: { employee: { select: { reportingManager: { select: { userId: true } } } } },
    });
    const managerUserId = leaveRequest?.employee.reportingManager?.userId;
    return managerUserId
      ? [{ stepOrder: 1, approverUserId: managerUserId }]
      : [{ stepOrder: 1, approverRole: UserRole.HR }];
  },

  async onApproved(tx, request: ApprovalRequestSummary) {
    const leaveRequest = await tx.leaveRequest.update({
      where: { id: request.entityId },
      data: { status: "APPROVED" },
    });

    const holidays = await tx.holiday.findMany({
      where: { date: { gte: leaveRequest.startDate, lte: leaveRequest.endDate } },
    });
    const holidayDates = new Set(holidays.map((h) => dateKey(h.date)));

    for (
      let cursor = new Date(leaveRequest.startDate);
      cursor <= leaveRequest.endDate;
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      const day = new Date(cursor);
      if (!DEFAULT_WORKING_WEEKDAYS.includes(day.getUTCDay())) continue;
      if (holidayDates.has(dateKey(day))) continue;

      await tx.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId: leaveRequest.employeeId, date: day } },
        create: {
          employeeId: leaveRequest.employeeId,
          date: day,
          status: "ON_LEAVE",
          source: AttendanceSource.LEAVE,
          notes: `Approved leave request ${leaveRequest.id}`,
        },
        update: {
          status: "ON_LEAVE",
          source: AttendanceSource.LEAVE,
          notes: `Approved leave request ${leaveRequest.id}`,
        },
      });
    }
  },

  async onRejected(tx, request: ApprovalRequestSummary) {
    await tx.leaveRequest.update({
      where: { id: request.entityId },
      data: { status: "REJECTED" },
    });
  },
});
