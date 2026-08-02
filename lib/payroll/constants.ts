/**
 * Domain "enums" for the Payroll module, following the same TS-const pattern
 * used by lib/hr/constants.ts — values are enforced at the TypeScript layer,
 * columns stay plain strings in the DB (see prisma/schema.prisma).
 */

export const PayrollPeriodStatus = {
  OPEN: "OPEN",
  PROCESSING: "PROCESSING",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  PAID: "PAID",
  CLOSED: "CLOSED",
} as const;
export type PayrollPeriodStatus =
  (typeof PayrollPeriodStatus)[keyof typeof PayrollPeriodStatus];

export const PAYROLL_PERIOD_STATUS_LABELS: Record<PayrollPeriodStatus, string> = {
  OPEN: "Open",
  PROCESSING: "Processing",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  PAID: "Paid",
  CLOSED: "Closed",
};

/** Allowed payroll-period status transitions — enforced centrally, never ad
 * hoc, same pattern as EMPLOYMENT_STATUS_TRANSITIONS (lib/hr/constants.ts). */
export const PAYROLL_PERIOD_STATUS_TRANSITIONS: Record<
  PayrollPeriodStatus,
  PayrollPeriodStatus[]
> = {
  OPEN: [PayrollPeriodStatus.PROCESSING],
  PROCESSING: [PayrollPeriodStatus.PENDING_APPROVAL, PayrollPeriodStatus.OPEN],
  PENDING_APPROVAL: [PayrollPeriodStatus.APPROVED, PayrollPeriodStatus.OPEN],
  APPROVED: [PayrollPeriodStatus.PAID],
  PAID: [PayrollPeriodStatus.CLOSED],
  CLOSED: [],
};

export const DisbursementStatus = {
  PENDING: "PENDING",
  DISBURSED: "DISBURSED",
  FAILED: "FAILED",
} as const;
export type DisbursementStatus =
  (typeof DisbursementStatus)[keyof typeof DisbursementStatus];

export const DISBURSEMENT_STATUS_LABELS: Record<DisbursementStatus, string> = {
  PENDING: "Pending",
  DISBURSED: "Disbursed",
  FAILED: "Failed",
};

export const CompensationComponentType = {
  ALLOWANCE: "ALLOWANCE",
  DEDUCTION: "DEDUCTION",
  BONUS: "BONUS",
} as const;
export type CompensationComponentType =
  (typeof CompensationComponentType)[keyof typeof CompensationComponentType];

export const PayslipLineItemType = {
  EARNING: "EARNING",
  DEDUCTION: "DEDUCTION",
  EMPLOYER_CONTRIBUTION: "EMPLOYER_CONTRIBUTION",
} as const;
export type PayslipLineItemType =
  (typeof PayslipLineItemType)[keyof typeof PayslipLineItemType];

/**
 * Starter Singapore CPF contribution schedule (Ordinary Wage ceiling and
 * age-banded employee/employer rates for monthly wages > $750). This MUST be
 * verified against the current CPF Board rates before any real payroll run
 * — rates step down periodically for older age bands and this is seeded only
 * as an editable starting point (see prisma/seed.ts and the CPF rate-table
 * settings page), never hardcoded into computation logic.
 *
 * Wages between $50 and $750 use graduated (non-full) rates that are NOT
 * modeled here yet — a below-$750 salary structure should have
 * `cpfApplicable` reviewed manually until that graduated schedule is added.
 */
export const DEFAULT_CPF_CONTRIBUTION_RATES = [
  {
    ageBandLabel: "55 and below",
    minAge: 0,
    maxAge: 55,
    wageCeiling: "7400.00",
    employeeRate: "0.2000",
    employerRate: "0.1700",
  },
  {
    ageBandLabel: "Above 55 to 60",
    minAge: 56,
    maxAge: 60,
    wageCeiling: "7400.00",
    employeeRate: "0.1500",
    employerRate: "0.1450",
  },
  {
    ageBandLabel: "Above 60 to 65",
    minAge: 61,
    maxAge: 65,
    wageCeiling: "7400.00",
    employeeRate: "0.0950",
    employerRate: "0.1100",
  },
  {
    ageBandLabel: "Above 65 to 70",
    minAge: 66,
    maxAge: 70,
    wageCeiling: "7400.00",
    employeeRate: "0.0750",
    employerRate: "0.0850",
  },
  {
    ageBandLabel: "Above 70",
    minAge: 71,
    maxAge: null,
    wageCeiling: "7400.00",
    employeeRate: "0.0500",
    employerRate: "0.0750",
  },
] as const;

/** SDL (Skills Development Levy) — employer-paid, 0.25% of monthly gross
 * wages, min $2/max $11.25 per employee, per current MOM/SSG schedule. Kept
 * as a code constant (not a DB table) since it's a single flat rate rather
 * than an age-banded schedule — revisit if that ever changes. */
export const SDL_RATE = 0.0025;
export const SDL_MIN_AMOUNT = 2;
export const SDL_MAX_AMOUNT = 11.25;
