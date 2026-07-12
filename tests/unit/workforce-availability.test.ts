import { describe, expect, it } from "vitest";
import { deriveWorkforceAvailability } from "@/lib/services/employee-availability-service";
import { EmploymentStatus, WorkforceAvailability } from "@/lib/hr/constants";

const baseInputs = {
  employmentStatus: EmploymentStatus.ACTIVE,
  isOnApprovedLeaveToday: false,
  activeAllocationPercentage: 0,
  override: null,
};

describe("deriveWorkforceAvailability", () => {
  it("returns INACTIVE for offboarded/terminated/resigned/retired/archived employees", () => {
    for (const status of [
      EmploymentStatus.OFFBOARDED,
      EmploymentStatus.TERMINATED,
      EmploymentStatus.RESIGNED,
      EmploymentStatus.RETIRED,
      EmploymentStatus.ARCHIVED,
    ]) {
      expect(
        deriveWorkforceAvailability({ ...baseInputs, employmentStatus: status })
      ).toBe(WorkforceAvailability.INACTIVE);
    }
  });

  it("returns ON_LEAVE when on approved leave today, even with active allocation", () => {
    expect(
      deriveWorkforceAvailability({
        ...baseInputs,
        isOnApprovedLeaveToday: true,
        activeAllocationPercentage: 100,
      })
    ).toBe(WorkforceAvailability.ON_LEAVE);
  });

  it("returns IN_PROJECT when allocation is exactly 100%", () => {
    expect(
      deriveWorkforceAvailability({ ...baseInputs, activeAllocationPercentage: 100 })
    ).toBe(WorkforceAvailability.IN_PROJECT);
  });

  it("returns IN_PROJECT when allocation exceeds 100% (defensive)", () => {
    expect(
      deriveWorkforceAvailability({ ...baseInputs, activeAllocationPercentage: 120 })
    ).toBe(WorkforceAvailability.IN_PROJECT);
  });

  it("returns PARTIALLY_ALLOCATED when allocation is between 0 and 100", () => {
    expect(
      deriveWorkforceAvailability({ ...baseInputs, activeAllocationPercentage: 40 })
    ).toBe(WorkforceAvailability.PARTIALLY_ALLOCATED);
  });

  it("returns FREE when allocation is 0 and not on leave", () => {
    expect(deriveWorkforceAvailability(baseInputs)).toBe(WorkforceAvailability.FREE);
  });

  it("prefers a current override over the derived status", () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 86_400_000);
    const tomorrow = new Date(now.getTime() + 86_400_000);
    expect(
      deriveWorkforceAvailability({
        ...baseInputs,
        activeAllocationPercentage: 100,
        override: {
          status: WorkforceAvailability.TEMPORARILY_UNAVAILABLE,
          effectiveFrom: yesterday,
          effectiveUntil: tomorrow,
        },
      })
    ).toBe(WorkforceAvailability.TEMPORARILY_UNAVAILABLE);
  });

  it("ignores an expired override and falls back to derivation", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000);
    const yesterday = new Date(Date.now() - 86_400_000);
    expect(
      deriveWorkforceAvailability({
        ...baseInputs,
        activeAllocationPercentage: 0,
        override: {
          status: WorkforceAvailability.TEMPORARILY_UNAVAILABLE,
          effectiveFrom: twoDaysAgo,
          effectiveUntil: yesterday,
        },
      })
    ).toBe(WorkforceAvailability.FREE);
  });

  it("ignores a future-dated override", () => {
    const tomorrow = new Date(Date.now() + 86_400_000);
    const nextWeek = new Date(Date.now() + 7 * 86_400_000);
    expect(
      deriveWorkforceAvailability({
        ...baseInputs,
        activeAllocationPercentage: 0,
        override: {
          status: WorkforceAvailability.TEMPORARILY_UNAVAILABLE,
          effectiveFrom: tomorrow,
          effectiveUntil: nextWeek,
        },
      })
    ).toBe(WorkforceAvailability.FREE);
  });

  it("a current override takes precedence even over an inactive employment status", () => {
    // Overrides are HR-authorized and reasoned (spec 4.4) — they're
    // evaluated first, so an explicit override can surface a non-INACTIVE
    // status for an offboarded employee if HR sets one intentionally.
    const now = new Date();
    expect(
      deriveWorkforceAvailability({
        ...baseInputs,
        employmentStatus: EmploymentStatus.OFFBOARDED,
        override: { status: WorkforceAvailability.FREE, effectiveFrom: now, effectiveUntil: null },
      })
    ).toBe(WorkforceAvailability.FREE);
  });
});
