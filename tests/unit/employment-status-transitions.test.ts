import { describe, expect, it } from "vitest";
import { isTransitionAllowed } from "@/lib/services/employee-status-service";
import { EmploymentStatus } from "@/lib/hr/constants";

describe("isTransitionAllowed", () => {
  it("allows DRAFT -> ACTIVE", () => {
    expect(isTransitionAllowed(EmploymentStatus.DRAFT, EmploymentStatus.ACTIVE)).toBe(true);
  });

  it("allows ACTIVE -> ON_LEAVE and back", () => {
    expect(isTransitionAllowed(EmploymentStatus.ACTIVE, EmploymentStatus.ON_LEAVE)).toBe(true);
    expect(isTransitionAllowed(EmploymentStatus.ON_LEAVE, EmploymentStatus.ACTIVE)).toBe(true);
  });

  it("rejects a same-status transition", () => {
    expect(isTransitionAllowed(EmploymentStatus.ACTIVE, EmploymentStatus.ACTIVE)).toBe(false);
  });

  it("rejects skipping straight from DRAFT to OFFBOARDED", () => {
    expect(isTransitionAllowed(EmploymentStatus.DRAFT, EmploymentStatus.OFFBOARDED)).toBe(false);
  });

  it("rejects any transition out of ARCHIVED (terminal state)", () => {
    for (const status of Object.values(EmploymentStatus)) {
      expect(isTransitionAllowed(EmploymentStatus.ARCHIVED, status)).toBe(false);
    }
  });

  it("requires RESIGNED/TERMINATED before OFFBOARDED", () => {
    expect(isTransitionAllowed(EmploymentStatus.ACTIVE, EmploymentStatus.OFFBOARDED)).toBe(false);
    expect(isTransitionAllowed(EmploymentStatus.RESIGNED, EmploymentStatus.OFFBOARDED)).toBe(true);
    expect(isTransitionAllowed(EmploymentStatus.TERMINATED, EmploymentStatus.OFFBOARDED)).toBe(true);
  });
});
