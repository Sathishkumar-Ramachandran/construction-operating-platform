import { describe, expect, it } from "vitest";
import { computeLeaveDayCount } from "@/lib/services/leave-service";
import { DEFAULT_WORKING_WEEKDAYS } from "@/lib/hr/constants";

function d(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

const baseInputs = {
  startHalfDay: false,
  endHalfDay: false,
  workingWeekdays: DEFAULT_WORKING_WEEKDAYS as number[],
  holidayDates: new Set<string>(),
};

describe("computeLeaveDayCount", () => {
  it("counts every day in a full working-week range with no holidays", () => {
    // Mon 2026-07-13 .. Fri 2026-07-17 (Mon-Sat working week, Sunday off)
    expect(
      computeLeaveDayCount({
        ...baseInputs,
        startDate: d("2026-07-13"),
        endDate: d("2026-07-17"),
      })
    ).toBe(5);
  });

  it("excludes the non-working weekday (Sunday) inside the range", () => {
    // Sat 2026-07-18 .. Mon 2026-07-20 — spans Sunday 2026-07-19 (off)
    expect(
      computeLeaveDayCount({
        ...baseInputs,
        startDate: d("2026-07-18"),
        endDate: d("2026-07-20"),
      })
    ).toBe(2);
  });

  it("excludes a Holiday date inside the range even though it's a working weekday", () => {
    expect(
      computeLeaveDayCount({
        ...baseInputs,
        startDate: d("2026-07-13"),
        endDate: d("2026-07-15"),
        holidayDates: new Set(["2026-07-14"]),
      })
    ).toBe(2);
  });

  it("applies a half-day deduction on the start date only", () => {
    expect(
      computeLeaveDayCount({
        ...baseInputs,
        startDate: d("2026-07-13"),
        endDate: d("2026-07-14"),
        startHalfDay: true,
      })
    ).toBe(1.5);
  });

  it("applies half-day deductions on both start and end dates", () => {
    expect(
      computeLeaveDayCount({
        ...baseInputs,
        startDate: d("2026-07-13"),
        endDate: d("2026-07-15"),
        startHalfDay: true,
        endHalfDay: true,
      })
    ).toBe(2);
  });

  it("treats a single-day half-day request (start === end, only startHalfDay flagged) as 0.5", () => {
    expect(
      computeLeaveDayCount({
        ...baseInputs,
        startDate: d("2026-07-13"),
        endDate: d("2026-07-13"),
        startHalfDay: true,
      })
    ).toBe(0.5);
  });

  it("does not double-subtract when a single-day request has both half-day flags set", () => {
    expect(
      computeLeaveDayCount({
        ...baseInputs,
        startDate: d("2026-07-13"),
        endDate: d("2026-07-13"),
        startHalfDay: true,
        endHalfDay: true,
      })
    ).toBe(0.5);
  });

  it("returns 0 when the entire range falls on non-working days", () => {
    // Single Sunday
    expect(
      computeLeaveDayCount({
        ...baseInputs,
        startDate: d("2026-07-19"),
        endDate: d("2026-07-19"),
      })
    ).toBe(0);
  });

  it("ignores half-day flags on a boundary that isn't itself a working day", () => {
    // Range is a single Sunday flagged half-day on both ends — still 0, never negative.
    expect(
      computeLeaveDayCount({
        ...baseInputs,
        startDate: d("2026-07-19"),
        endDate: d("2026-07-19"),
        startHalfDay: true,
        endHalfDay: true,
      })
    ).toBe(0);
  });
});
