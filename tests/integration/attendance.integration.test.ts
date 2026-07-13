import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/authorization/roles";
import { ErrorCode } from "@/lib/errors";
import { AttendanceStatus, AttendanceSource } from "@/lib/hr/constants";
import { AuditAction } from "@/lib/services/audit-service";
import { createEmployee } from "@/lib/services/employee-service";
import {
  checkIn,
  checkOut,
  correctAttendance,
  getEmployeeAttendanceHistory,
  getAttendanceBoardForDate,
} from "@/lib/services/attendance-service";
import { createActor, cleanupUserIds } from "@/tests/helpers/actors";
import {
  buildCreateEmployeeInput,
  createdEmployeeIds,
  cleanupHrFixtures,
} from "@/tests/helpers/hr-fixtures";

const createdUserIds: string[] = [];
const createdHolidayIds: string[] = [];

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

describe("attendance-service (integration)", () => {
  afterAll(async () => {
    if (createdHolidayIds.length > 0) {
      await db.holiday.deleteMany({ where: { id: { in: createdHolidayIds } } });
    }
    await cleanupHrFixtures();
    await cleanupUserIds(createdUserIds);
  });

  it("checkIn creates a PRESENT record for today when no shift is assigned", async () => {
    const { actor } = await createLinkedEmployee(UserRole.HR, "attendance-checkin");

    const record = await checkIn(actor);

    expect(record.status).toBe(AttendanceStatus.PRESENT);
    expect(record.source).toBe(AttendanceSource.SELF);
    expect(record.checkInAt).not.toBeNull();
    expect(record.checkOutAt).toBeNull();
  });

  it("rejects a second check-in for the same day", async () => {
    const { actor } = await createLinkedEmployee(UserRole.HR, "attendance-double-checkin");

    await checkIn(actor);
    await expect(checkIn(actor)).rejects.toMatchObject({
      code: ErrorCode.ATTENDANCE_ALREADY_CHECKED_IN,
    });
  });

  it("rejects check-out before check-in", async () => {
    const { actor } = await createLinkedEmployee(UserRole.HR, "attendance-checkout-first");

    await expect(checkOut(actor)).rejects.toMatchObject({
      code: ErrorCode.ATTENDANCE_NOT_CHECKED_IN,
    });
  });

  it("checkOut sets checkOutAt without changing the derived status", async () => {
    const { actor } = await createLinkedEmployee(UserRole.HR, "attendance-checkout");

    const checkedIn = await checkIn(actor);
    const checkedOut = await checkOut(actor);

    expect(checkedOut.checkOutAt).not.toBeNull();
    expect(checkedOut.status).toBe(checkedIn.status);
  });

  it("rejects a second check-out for the same day", async () => {
    const { actor } = await createLinkedEmployee(UserRole.HR, "attendance-double-checkout");

    await checkIn(actor);
    await checkOut(actor);
    await expect(checkOut(actor)).rejects.toMatchObject({
      code: ErrorCode.ATTENDANCE_ALREADY_CHECKED_OUT,
    });
  });

  it("HR correction upserts a record and audits before/after data", async () => {
    const hrActor = await createActor(UserRole.HR, "attendance-correct-hr");
    createdUserIds.push(hrActor.id);
    const employee = await createEmployee(hrActor, await buildCreateEmployeeInput());
    createdEmployeeIds.push(employee.id);

    const date = todayIso();
    const record = await correctAttendance(hrActor, {
      employeeId: employee.id,
      date,
      status: AttendanceStatus.ON_LEAVE,
      checkInTime: "",
      checkOutTime: "",
      notes: "Approved leave — vitest integration test.",
    });

    expect(record.status).toBe(AttendanceStatus.ON_LEAVE);
    expect(record.source).toBe(AttendanceSource.HR_MANUAL);

    const auditRow = await db.auditLog.findFirst({
      where: { action: AuditAction.ATTENDANCE_RECORD_CORRECTED, entityId: record.id },
      orderBy: { createdAt: "desc" },
    });
    expect(auditRow).not.toBeNull();
    expect((auditRow?.afterData as { status: string } | null)?.status).toBe(AttendanceStatus.ON_LEAVE);

    // Correcting again should upsert (not duplicate) and record beforeData
    // from the first correction.
    const corrected = await correctAttendance(hrActor, {
      employeeId: employee.id,
      date,
      status: AttendanceStatus.HALF_DAY,
      checkInTime: "",
      checkOutTime: "",
      notes: "Adjusted to half-day.",
    });
    expect(corrected.id).toBe(record.id);

    const secondAudit = await db.auditLog.findFirst({
      where: { action: AuditAction.ATTENDANCE_RECORD_CORRECTED, entityId: record.id },
      orderBy: { createdAt: "desc" },
    });
    expect((secondAudit?.beforeData as { status: string } | null)?.status).toBe(AttendanceStatus.ON_LEAVE);
  });

  it("a holiday suppresses Absent/Late derivation for that date in history", async () => {
    const { actor, employee } = await createLinkedEmployee(UserRole.HR, "attendance-holiday");

    const pastDate = new Date();
    pastDate.setUTCDate(pastDate.getUTCDate() - 3);
    // Avoid landing on the default weekly off-day (UTC — matches how the
    // service derives working days) so this unambiguously tests holiday
    // precedence, not the weekend rule.
    while (pastDate.getUTCDay() === 0) pastDate.setUTCDate(pastDate.getUTCDate() - 1);
    const pastDateIso = pastDate.toISOString().slice(0, 10);

    const holiday = await db.holiday.create({
      data: { date: new Date(pastDateIso), name: "Vitest Holiday" },
    });
    createdHolidayIds.push(holiday.id);

    const history = await getEmployeeAttendanceHistory(actor, employee.id, {
      from: pastDateIso,
      to: pastDateIso,
    });

    expect(history).toHaveLength(1);
    expect(history[0].status).toBe(AttendanceStatus.HOLIDAY);
  });

  it("board query scopes a MANAGER to their reporting chain but shows HR everyone", async () => {
    const { actor: managerActor, employee: managerEmployee } = await createLinkedEmployee(
      UserRole.MANAGER,
      "attendance-board-manager"
    );
    const { employee: directReport } = await createLinkedEmployee(
      UserRole.HR,
      "attendance-board-report",
      { reportingManagerId: managerEmployee.id }
    );
    const { employee: unrelated } = await createLinkedEmployee(
      UserRole.HR,
      "attendance-board-unrelated"
    );

    const date = todayIso();

    const managerView = await getAttendanceBoardForDate(managerActor, date, {});
    const managerVisibleIds = managerView.employees.map((e) => e.id);
    expect(managerVisibleIds).toContain(directReport.id);
    expect(managerVisibleIds).not.toContain(unrelated.id);

    const hrActor = await createActor(UserRole.HR, "attendance-board-hr");
    createdUserIds.push(hrActor.id);
    const hrView = await getAttendanceBoardForDate(hrActor, date, {});
    const hrVisibleIds = hrView.employees.map((e) => e.id);
    expect(hrVisibleIds).toContain(directReport.id);
    expect(hrVisibleIds).toContain(unrelated.id);
  });
});
