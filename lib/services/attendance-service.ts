import { db, currentCompanyId } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import {
  AttendanceStatus,
  AttendanceSource,
  DEFAULT_WORKING_WEEKDAYS,
  INACTIVE_EMPLOYMENT_STATUSES,
  EmploymentStatus,
} from "@/lib/hr/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { getActorEmployeeId, listEmployees } from "@/lib/services/employee-service";
import { isInReportingChain } from "@/lib/services/org-hierarchy-service";
import { isActivelyAssignedToSameProject } from "@/lib/services/employee-allocation-service";
import { hasPermission } from "@/lib/services/authorization-service";
import { employeeDisplayName } from "@/lib/hr/employee-display";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import type { CorrectAttendanceInput } from "@/lib/validation/attendance";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

/**
 * Normalizes to UTC midnight of the given date's UTC calendar day. Using
 * UTC consistently (not local getters) matters here because date-only
 * strings like "2026-07-10" parse as UTC midnight — mixing that with local
 * getters would shift the computed day by one depending on server timezone.
 */
function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function combineDateAndTime(date: Date, time: string): Date {
  const [hours, minutes] = time.split(":").map(Number);
  const combined = new Date(date);
  combined.setUTCHours(hours, minutes, 0, 0);
  return combined;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export type DeriveAttendanceStatusInput = {
  isHoliday: boolean;
  isWorkingDay: boolean;
  checkInAt: Date | null;
  shift: { startTime: string; gracePeriodMinutes: number } | null;
  isToday: boolean;
};

/**
 * Pure decision-tree — no DB access, fully unit testable. HALF_DAY and
 * ON_LEAVE are never derived here; they only ever come from an explicit HR
 * correction row (see correctAttendance), which bypasses this function.
 */
export function deriveAttendanceStatus(
  input: DeriveAttendanceStatusInput
): AttendanceStatus {
  if (input.isHoliday) return AttendanceStatus.HOLIDAY;
  if (!input.isWorkingDay) return AttendanceStatus.WEEKEND;

  if (input.checkInAt) {
    if (input.shift) {
      const [hours, minutes] = input.shift.startTime.split(":").map(Number);
      const shiftStartWithGrace = new Date(input.checkInAt);
      shiftStartWithGrace.setHours(hours, minutes + input.shift.gracePeriodMinutes, 0, 0);
      if (input.checkInAt > shiftStartWithGrace) return AttendanceStatus.LATE;
    }
    return AttendanceStatus.PRESENT;
  }

  if (input.isToday) return AttendanceStatus.NOT_MARKED;
  return AttendanceStatus.ABSENT;
}

async function assertCanViewEmployeeAttendance(
  actor: AuthenticatedUser,
  employeeId: string
): Promise<void> {
  if (actor.role === UserRole.SUPER_ADMIN) return;

  const actorEmployeeId = await getActorEmployeeId(actor.id);
  if (actorEmployeeId === employeeId) return;

  const canManage = await hasPermission(actor, PERMISSIONS.HR_ATTENDANCE_MANAGE.code);
  if (canManage) return;

  const canView = await hasPermission(actor, PERMISSIONS.HR_ATTENDANCE_VIEW.code);
  if (!canView) throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);

  if (actor.role === UserRole.MANAGER) {
    if (!actorEmployeeId) throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);
    const managesTarget = await isInReportingChain(employeeId, actorEmployeeId);
    if (!managesTarget) throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);
  }
}

/** Write-path authorization for correctAttendance — narrower than the
 * view-path check above. HR/Admin (HR_ATTENDANCE_MANAGE) stay org-wide;
 * a Manager may only mark a Team Member they share an active project
 * assignment with, never a fellow Manager/Admin/HR ("for Managers, HR
 * will put attendance"). Project-membership-scoped, not reporting-chain —
 * a Manager marks site workers on their project, not their org reportees. */
async function assertCanMarkAttendanceForEmployee(
  actor: AuthenticatedUser,
  targetEmployeeId: string
): Promise<void> {
  if (actor.role === UserRole.SUPER_ADMIN) return;
  if (await hasPermission(actor, PERMISSIONS.HR_ATTENDANCE_MANAGE.code)) return;
  if (actor.role !== UserRole.MANAGER) {
    throw new AppError(ErrorCode.ATTENDANCE_MARK_NOT_AUTHORIZED);
  }

  const actorEmployeeId = await getActorEmployeeId(actor.id);
  if (!actorEmployeeId) throw new AppError(ErrorCode.ATTENDANCE_MARK_NOT_AUTHORIZED);

  const target = await db.employee.findUnique({
    where: { id: targetEmployeeId },
    select: { user: { select: { role: { select: { code: true } } } } },
  });
  if (target?.user?.role && target.user.role.code !== UserRole.TEAM_MEMBER) {
    throw new AppError(ErrorCode.ATTENDANCE_MARK_NOT_AUTHORIZED);
  }

  const sameProject = await isActivelyAssignedToSameProject(actorEmployeeId, targetEmployeeId);
  if (!sameProject) throw new AppError(ErrorCode.ATTENDANCE_MARK_NOT_AUTHORIZED);
}

export async function checkIn(actor: AuthenticatedUser, meta: ActorMeta = {}) {
  const employeeId = await getActorEmployeeId(actor.id);
  if (!employeeId) throw new AppError(ErrorCode.ATTENDANCE_NO_LINKED_EMPLOYEE);

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { employmentStatus: true, defaultSiteId: true, defaultShiftTypeId: true },
  });
  if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);
  if (INACTIVE_EMPLOYMENT_STATUSES.includes(employee.employmentStatus as EmploymentStatus)) {
    throw new AppError(ErrorCode.EMPLOYEE_INACTIVE);
  }

  const now = new Date();
  const today = startOfDay(now);

  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });
  if (existing?.checkInAt) throw new AppError(ErrorCode.ATTENDANCE_ALREADY_CHECKED_IN);

  const [holiday, shift] = await Promise.all([
    db.holiday.findUnique({ where: { companyId_date: { companyId: currentCompanyId(), date: today } } }),
    employee.defaultShiftTypeId
      ? db.shiftType.findUnique({ where: { id: employee.defaultShiftTypeId } })
      : Promise.resolve(null),
  ]);

  const status = deriveAttendanceStatus({
    isHoliday: !!holiday,
    isWorkingDay: DEFAULT_WORKING_WEEKDAYS.includes(now.getDay()),
    checkInAt: now,
    shift: shift ? { startTime: shift.startTime, gracePeriodMinutes: shift.gracePeriodMinutes } : null,
    isToday: true,
  });

  return db.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      create: {
        employeeId,
        date: today,
        siteId: employee.defaultSiteId,
        shiftTypeId: employee.defaultShiftTypeId,
        checkInAt: now,
        status,
        source: AttendanceSource.SELF,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
      update: {
        checkInAt: now,
        siteId: employee.defaultSiteId,
        shiftTypeId: employee.defaultShiftTypeId,
        status,
        source: AttendanceSource.SELF,
        updatedBy: actor.id,
      },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.ATTENDANCE_CHECKED_IN,
      entityType: "AttendanceRecord",
      entityId: record.id,
      afterData: { status, checkInAt: now.toISOString() },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return record;
  });
}

export async function checkOut(actor: AuthenticatedUser, meta: ActorMeta = {}) {
  const employeeId = await getActorEmployeeId(actor.id);
  if (!employeeId) throw new AppError(ErrorCode.ATTENDANCE_NO_LINKED_EMPLOYEE);

  const today = startOfDay(new Date());
  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
  });
  if (!existing || !existing.checkInAt) throw new AppError(ErrorCode.ATTENDANCE_NOT_CHECKED_IN);
  if (existing.checkOutAt) throw new AppError(ErrorCode.ATTENDANCE_ALREADY_CHECKED_OUT);

  const now = new Date();

  return db.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.update({
      where: { id: existing.id },
      data: { checkOutAt: now, updatedBy: actor.id },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.ATTENDANCE_CHECKED_OUT,
      entityType: "AttendanceRecord",
      entityId: record.id,
      afterData: { checkOutAt: now.toISOString() },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return record;
  });
}

export async function getMyTodayAttendance(actor: AuthenticatedUser) {
  const employeeId = await getActorEmployeeId(actor.id);
  if (!employeeId) return null;

  const today = startOfDay(new Date());
  const [record, holiday] = await Promise.all([
    db.attendanceRecord.findUnique({ where: { employeeId_date: { employeeId, date: today } } }),
    db.holiday.findUnique({ where: { companyId_date: { companyId: currentCompanyId(), date: today } } }),
  ]);

  if (record) {
    return { ...record, status: record.status as AttendanceStatus, holidayName: holiday?.name ?? null };
  }

  const status = deriveAttendanceStatus({
    isHoliday: !!holiday,
    isWorkingDay: DEFAULT_WORKING_WEEKDAYS.includes(today.getDay()),
    checkInAt: null,
    shift: null,
    isToday: true,
  });

  return {
    id: null,
    employeeId,
    date: today,
    checkInAt: null,
    checkOutAt: null,
    status,
    source: null,
    notes: null,
    holidayName: holiday?.name ?? null,
  };
}

export type AttendanceHistoryDay = {
  date: string;
  status: AttendanceStatus;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  source: string | null;
  notes: string | null;
};

export async function getEmployeeAttendanceHistory(
  actor: AuthenticatedUser,
  employeeId: string,
  range: { from: string; to: string }
): Promise<AttendanceHistoryDay[]> {
  await assertCanViewEmployeeAttendance(actor, employeeId);

  const from = startOfDay(new Date(range.from));
  const to = startOfDay(new Date(range.to));

  const [records, holidays] = await Promise.all([
    db.attendanceRecord.findMany({ where: { employeeId, date: { gte: from, lte: to } } }),
    db.holiday.findMany({ where: { date: { gte: from, lte: to } } }),
  ]);

  const recordByDate = new Map(records.map((r) => [dateKey(r.date), r]));
  const holidayByDate = new Map(holidays.map((h) => [dateKey(h.date), h]));
  const todayKey = dateKey(startOfDay(new Date()));

  const days: AttendanceHistoryDay[] = [];
  for (let cursor = new Date(to); cursor >= from; cursor.setUTCDate(cursor.getUTCDate() - 1)) {
    const key = dateKey(cursor);
    const existing = recordByDate.get(key);
    if (existing) {
      days.push({
        date: key,
        status: existing.status as AttendanceStatus,
        checkInAt: existing.checkInAt,
        checkOutAt: existing.checkOutAt,
        source: existing.source,
        notes: existing.notes,
      });
      continue;
    }

    const holiday = holidayByDate.get(key);
    const status = deriveAttendanceStatus({
      isHoliday: !!holiday,
      isWorkingDay: DEFAULT_WORKING_WEEKDAYS.includes(cursor.getUTCDay()),
      checkInAt: null,
      shift: null,
      isToday: key === todayKey,
    });
    days.push({
      date: key,
      status,
      checkInAt: null,
      checkOutAt: null,
      source: null,
      notes: holiday?.name ?? null,
    });
  }

  return days;
}

export async function getAttendanceBoardForDate(
  actor: AuthenticatedUser,
  dateInput: string,
  filters: { search?: string; departmentId?: string; status?: AttendanceStatus }
) {
  const date = startOfDay(new Date(dateInput));

  const { employees } = await listEmployees(actor, {
    search: filters.search,
    departmentId: filters.departmentId,
    page: 1,
    pageSize: 1000,
  });

  const employeeIds = employees.map((e) => e.id);
  const [records, holiday] = await Promise.all([
    employeeIds.length
      ? db.attendanceRecord.findMany({ where: { employeeId: { in: employeeIds }, date } })
      : Promise.resolve([]),
    db.holiday.findUnique({ where: { companyId_date: { companyId: currentCompanyId(), date } } }),
  ]);

  const recordByEmployee = new Map(records.map((r) => [r.employeeId, r]));
  const today = startOfDay(new Date());
  const isToday = date.getTime() === today.getTime();
  const isWorkingDay = DEFAULT_WORKING_WEEKDAYS.includes(date.getDay());

  let enriched = employees.map((employee) => {
    const record = recordByEmployee.get(employee.id);
    const status = record
      ? (record.status as AttendanceStatus)
      : deriveAttendanceStatus({
          isHoliday: !!holiday,
          isWorkingDay,
          checkInAt: null,
          shift: null,
          isToday,
        });
    return {
      ...employee,
      displayName: employeeDisplayName(employee),
      attendanceStatus: status,
      checkInAt: record?.checkInAt ?? null,
      checkOutAt: record?.checkOutAt ?? null,
    };
  });

  if (filters.status) {
    enriched = enriched.filter((e) => e.attendanceStatus === filters.status);
  }

  return { employees: enriched, holidayName: holiday?.name ?? null };
}

export async function correctAttendance(
  actor: AuthenticatedUser,
  input: CorrectAttendanceInput,
  meta: ActorMeta = {}
) {
  await assertCanMarkAttendanceForEmployee(actor, input.employeeId);

  const employee = await db.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true, defaultSiteId: true, defaultShiftTypeId: true },
  });
  if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);

  const source = actor.role === UserRole.MANAGER ? AttendanceSource.MANAGER_MANUAL : AttendanceSource.HR_MANUAL;
  const date = startOfDay(new Date(input.date));
  const checkInAt = input.checkInTime ? combineDateAndTime(date, input.checkInTime) : null;
  const checkOutAt = input.checkOutTime ? combineDateAndTime(date, input.checkOutTime) : null;

  const existing = await db.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId: input.employeeId, date } },
  });

  return db.$transaction(async (tx) => {
    const record = await tx.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: input.employeeId, date } },
      create: {
        employeeId: input.employeeId,
        date,
        siteId: employee.defaultSiteId,
        shiftTypeId: employee.defaultShiftTypeId,
        checkInAt,
        checkOutAt,
        status: input.status,
        source,
        notes: input.notes,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
      update: {
        checkInAt,
        checkOutAt,
        status: input.status,
        source,
        notes: input.notes,
        updatedBy: actor.id,
      },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.ATTENDANCE_RECORD_CORRECTED,
      entityType: "AttendanceRecord",
      entityId: record.id,
      beforeData: existing
        ? {
            status: existing.status,
            checkInAt: existing.checkInAt?.toISOString() ?? null,
            checkOutAt: existing.checkOutAt?.toISOString() ?? null,
          }
        : null,
      afterData: {
        status: input.status,
        checkInAt: checkInAt?.toISOString() ?? null,
        checkOutAt: checkOutAt?.toISOString() ?? null,
        reason: input.notes,
      },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return record;
  });
}
