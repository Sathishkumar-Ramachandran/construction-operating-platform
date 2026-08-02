import { db } from "@/lib/db";

/**
 * Pure CPF calculation, isolated from payroll-service.ts so the statutory
 * formula can change (rate updates, wage-ceiling revisions) without
 * touching the rest of the payroll run. Rates come from the admin-editable
 * CpfContributionRate table, never hardcoded — see lib/payroll/constants.ts
 * for the seeded starter schedule and its caveats.
 */

export type CpfContribution = {
  employeeCpfAmount: number;
  employerCpfAmount: number;
};

function ageAsOf(dateOfBirth: Date, asOfDate: Date): number {
  let age = asOfDate.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    asOfDate.getUTCMonth() > dateOfBirth.getUTCMonth() ||
    (asOfDate.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      asOfDate.getUTCDate() >= dateOfBirth.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** CPF Board rounds each contribution amount to the nearest dollar. */
function roundToNearestDollar(amount: number): number {
  return Math.round(amount);
}

/**
 * Ordinary Wage-only CPF (Additional Wage/bonus CPF is out of scope for this
 * phase — see the platform expansion plan). Below the $50 threshold no CPF
 * is due; wages from $50-$750 use a graduated (non-full-rate) schedule that
 * isn't modeled yet, so this returns zero contribution for that band with
 * the caller expected to flag it for manual review rather than silently
 * under/over-charge CPF.
 */
export async function computeCpfContribution(
  ordinaryWage: number,
  dateOfBirth: Date | null,
  asOfDate: Date,
  cpfApplicable: boolean
): Promise<CpfContribution> {
  if (!cpfApplicable || !dateOfBirth || ordinaryWage < 50) {
    return { employeeCpfAmount: 0, employerCpfAmount: 0 };
  }
  if (ordinaryWage <= 750) {
    // Graduated schedule not modeled — see doc comment above.
    return { employeeCpfAmount: 0, employerCpfAmount: 0 };
  }

  const age = ageAsOf(dateOfBirth, asOfDate);
  const rate = await db.cpfContributionRate.findFirst({
    where: {
      minAge: { lte: age },
      effectiveFrom: { lte: asOfDate },
      AND: [
        { OR: [{ maxAge: null }, { maxAge: { gte: age } }] },
        { OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOfDate } }] },
      ],
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!rate) {
    return { employeeCpfAmount: 0, employerCpfAmount: 0 };
  }

  const cappedWage = Math.min(ordinaryWage, Number(rate.wageCeiling));
  return {
    employeeCpfAmount: roundToNearestDollar(cappedWage * Number(rate.employeeRate)),
    employerCpfAmount: roundToNearestDollar(cappedWage * Number(rate.employerRate)),
  };
}
