import { WorkPassStatus, EXPIRY_ALERT_THRESHOLDS_DAYS } from "@/lib/hr/constants";

/**
 * Derives a live expiry-aware status layered on top of the authoritative
 * stored status. SUSPENDED/REVOKED/PENDING_VERIFICATION always win (they
 * aren't date-derivable); otherwise VALID/EXPIRING/EXPIRED is computed from
 * the expiry date so nothing needs a background job just to "become"
 * expired.
 */
export function deriveExpiryState(
  expiryDate: Date | null,
  storedStatus: WorkPassStatus,
  referenceDate: Date = new Date()
): WorkPassStatus {
  if (
    storedStatus === WorkPassStatus.SUSPENDED ||
    storedStatus === WorkPassStatus.REVOKED ||
    storedStatus === WorkPassStatus.PENDING_VERIFICATION
  ) {
    return storedStatus;
  }

  if (!expiryDate) return WorkPassStatus.VALID;

  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry < 0) return WorkPassStatus.EXPIRED;
  if (daysUntilExpiry <= Math.max(...EXPIRY_ALERT_THRESHOLDS_DAYS)) {
    return WorkPassStatus.EXPIRING;
  }
  return WorkPassStatus.VALID;
}

export function daysUntil(date: Date, referenceDate: Date = new Date()): number {
  return Math.ceil((date.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24));
}
