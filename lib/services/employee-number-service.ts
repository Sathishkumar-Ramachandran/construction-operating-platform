import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

const PREFIX = "EXL-EMP-";
const PAD_LENGTH = 5;

export function formatEmployeeNumber(sequenceValue: number): string {
  return `${PREFIX}${String(sequenceValue).padStart(PAD_LENGTH, "0")}`;
}

/**
 * Transaction-safe employee-number allocation. Locks the single counter
 * row (SELECT ... FOR UPDATE) inside the caller's transaction so concurrent
 * employee-creation requests can never receive the same number — never
 * derived from count()+1, which is not safe under concurrency.
 */
export async function allocateNextEmployeeNumber(
  tx: Prisma.TransactionClient
): Promise<string> {
  const rows = await tx.$queryRaw<{ last_number: number }[]>`
    SELECT "last_number" FROM "employee_number_sequence" WHERE "id" = 1 FOR UPDATE
  `;
  const current = rows[0]?.last_number ?? 0;
  const next = current + 1;

  await tx.employeeNumberSequence.update({
    where: { id: 1 },
    data: { lastNumber: next },
  });

  return formatEmployeeNumber(next);
}

/** Ensures the singleton counter row exists (defensive; migration also seeds it). */
export async function ensureEmployeeNumberSequenceSeeded(): Promise<void> {
  await db.employeeNumberSequence.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, lastNumber: 0 },
  });
}
