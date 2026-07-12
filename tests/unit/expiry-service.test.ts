import { describe, expect, it } from "vitest";
import { deriveExpiryState } from "@/lib/services/expiry-service";
import { WorkPassStatus } from "@/lib/hr/constants";

const REFERENCE = new Date("2026-07-12T00:00:00.000Z");

function daysFromReference(days: number): Date {
  return new Date(REFERENCE.getTime() + days * 86_400_000);
}

describe("deriveExpiryState", () => {
  it("returns VALID when expiry is well in the future", () => {
    expect(
      deriveExpiryState(daysFromReference(200), WorkPassStatus.VALID, REFERENCE)
    ).toBe(WorkPassStatus.VALID);
  });

  it("returns EXPIRING within the largest alert threshold window", () => {
    expect(
      deriveExpiryState(daysFromReference(45), WorkPassStatus.VALID, REFERENCE)
    ).toBe(WorkPassStatus.EXPIRING);
  });

  it("returns EXPIRED once the expiry date has passed", () => {
    expect(
      deriveExpiryState(daysFromReference(-1), WorkPassStatus.VALID, REFERENCE)
    ).toBe(WorkPassStatus.EXPIRED);
  });

  it("returns VALID when there is no expiry date at all", () => {
    expect(deriveExpiryState(null, WorkPassStatus.VALID, REFERENCE)).toBe(
      WorkPassStatus.VALID
    );
  });

  it("never overrides an authoritative SUSPENDED/REVOKED/PENDING_VERIFICATION status", () => {
    expect(
      deriveExpiryState(daysFromReference(-30), WorkPassStatus.SUSPENDED, REFERENCE)
    ).toBe(WorkPassStatus.SUSPENDED);
    expect(
      deriveExpiryState(daysFromReference(200), WorkPassStatus.REVOKED, REFERENCE)
    ).toBe(WorkPassStatus.REVOKED);
    expect(
      deriveExpiryState(daysFromReference(200), WorkPassStatus.PENDING_VERIFICATION, REFERENCE)
    ).toBe(WorkPassStatus.PENDING_VERIFICATION);
  });
});
