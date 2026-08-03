import { db, type Db } from "@/lib/db";

const PREFIX = "EXL-EMP-";
const PAD_LENGTH = 5;

export function formatEmployeeNumber(sequenceValue: number): string {
  return `${PREFIX}${String(sequenceValue).padStart(PAD_LENGTH, "0")}`;
}

/**
 * Transaction-safe employee-number allocation. Locks the calling company's
 * counter row (SELECT ... FOR UPDATE) inside the caller's transaction so
 * concurrent employee-creation requests can never receive the same number
 * — never derived from count()+1, which is not safe under concurrency.
 * One counter per company (companyId is the row's primary key), so each
 * company's numbering starts independently from zero.
 */
export async function allocateNextEmployeeNumber(
  tx: Db,
  companyId: string
): Promise<string> {
  const rows = await tx.$queryRaw<{ last_number: number }[]>`
    SELECT "last_number" FROM "employee_number_sequence" WHERE "company_id" = ${companyId} FOR UPDATE
  `;
  const current = rows[0]?.last_number ?? 0;
  const next = current + 1;

  await tx.employeeNumberSequence.upsert({
    where: { companyId },
    update: { lastNumber: next },
    create: { companyId, lastNumber: next },
  });

  return formatEmployeeNumber(next);
}

/** Ensures a company's counter row exists (defensive; provisioning also creates it). */
export async function ensureEmployeeNumberSequenceSeeded(companyId: string): Promise<void> {
  await db.employeeNumberSequence.upsert({
    where: { companyId },
    update: {},
    create: { companyId, lastNumber: 0 },
  });
}
