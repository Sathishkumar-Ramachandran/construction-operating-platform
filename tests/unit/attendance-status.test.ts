import { describe, expect, it } from "vitest";
import { deriveAttendanceStatus } from "@/lib/services/attendance-service";
import { AttendanceStatus } from "@/lib/hr/constants";

const baseInputs = {
  isHoliday: false,
  isWorkingDay: true,
  checkInAt: null as Date | null,
  shift: null as { startTime: string; gracePeriodMinutes: number } | null,
  isToday: false,
};

describe("deriveAttendanceStatus", () => {
  it("returns HOLIDAY when the date is a holiday, regardless of other inputs", () => {
    expect(
      deriveAttendanceStatus({
        ...baseInputs,
        isHoliday: true,
        isWorkingDay: false,
        checkInAt: new Date("2026-07-13T08:00:00"),
      })
    ).toBe(AttendanceStatus.HOLIDAY);
  });

  it("returns WEEKEND for a non-working day that isn't a holiday", () => {
    expect(deriveAttendanceStatus({ ...baseInputs, isWorkingDay: false })).toBe(
      AttendanceStatus.WEEKEND
    );
  });

  it("returns PRESENT when checked in with no shift assigned (never late without a shift)", () => {
    expect(
      deriveAttendanceStatus({
        ...baseInputs,
        checkInAt: new Date("2026-07-13T23:00:00"),
        shift: null,
      })
    ).toBe(AttendanceStatus.PRESENT);
  });

  it("returns PRESENT when checked in within the shift's grace period", () => {
    expect(
      deriveAttendanceStatus({
        ...baseInputs,
        checkInAt: new Date("2026-07-13T08:10:00"),
        shift: { startTime: "08:00", gracePeriodMinutes: 15 },
      })
    ).toBe(AttendanceStatus.PRESENT);
  });

  it("returns LATE when checked in after the shift's start + grace period", () => {
    expect(
      deriveAttendanceStatus({
        ...baseInputs,
        checkInAt: new Date("2026-07-13T08:20:00"),
        shift: { startTime: "08:00", gracePeriodMinutes: 15 },
      })
    ).toBe(AttendanceStatus.LATE);
  });

  it("returns NOT_MARKED for today with no check-in yet", () => {
    expect(deriveAttendanceStatus({ ...baseInputs, isToday: true })).toBe(
      AttendanceStatus.NOT_MARKED
    );
  });

  it("returns ABSENT for a past working day with no check-in", () => {
    expect(deriveAttendanceStatus({ ...baseInputs, isToday: false })).toBe(
      AttendanceStatus.ABSENT
    );
  });

  it("holiday takes precedence over a present check-in", () => {
    expect(
      deriveAttendanceStatus({
        ...baseInputs,
        isHoliday: true,
        checkInAt: new Date("2026-07-13T08:00:00"),
        shift: { startTime: "08:00", gracePeriodMinutes: 15 },
      })
    ).toBe(AttendanceStatus.HOLIDAY);
  });
});
