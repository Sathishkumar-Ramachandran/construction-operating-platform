import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { encryptField, lastCharacters } from "@/lib/security/encryption";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import type {
  EmergencyContactActionInput,
  BankAccountActionInput,
} from "@/lib/validation/employee-personal";
import type { AuthenticatedUser } from "@/types/auth";

export async function listEmergencyContacts(employeeId: string) {
  return db.emergencyContact.findMany({
    where: { employeeId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
}

export async function addEmergencyContact(
  actor: AuthenticatedUser,
  input: EmergencyContactActionInput
) {
  if (input.isPrimary) {
    await db.emergencyContact.updateMany({
      where: { employeeId: input.employeeId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const contact = await db.emergencyContact.create({
    data: {
      employeeId: input.employeeId,
      name: input.name,
      relationship: input.relationship,
      phone: input.phone,
      alternatePhone: input.alternatePhone || null,
      email: input.email || null,
      isPrimary: input.isPrimary,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.EMPLOYEE_PERSONAL_INFO_CHANGED,
    entityType: "Employee",
    entityId: input.employeeId,
    metadata: { change: "emergency_contact_added" },
  });

  return contact;
}

/** Masked bank accounts — never returns ciphertext or full numbers. */
export async function listBankAccountsMasked(employeeId: string) {
  const accounts = await db.employeeBankAccount.findMany({
    where: { employeeId },
    orderBy: [{ isPrimary: "desc" }, { effectiveFrom: "desc" }],
    select: {
      id: true,
      bankName: true,
      accountHolderName: true,
      accountNumberLast4: true,
      bankCode: true,
      branchCode: true,
      isPrimary: true,
      effectiveFrom: true,
      effectiveUntil: true,
    },
  });
  return accounts.map((a) => ({
    ...a,
    maskedAccountNumber: `${"•".repeat(8)}${a.accountNumberLast4}`,
  }));
}

export async function addBankAccount(
  actor: AuthenticatedUser,
  input: BankAccountActionInput
) {
  const employee = await db.employee.findUnique({
    where: { id: input.employeeId },
    select: { id: true },
  });
  if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);

  if (input.isPrimary) {
    await db.employeeBankAccount.updateMany({
      where: { employeeId: input.employeeId, isPrimary: true },
      data: { isPrimary: false },
    });
  }

  const account = await db.employeeBankAccount.create({
    data: {
      employeeId: input.employeeId,
      bankName: input.bankName,
      accountHolderName: input.accountHolderName,
      accountNumberCiphertext: encryptField(input.accountNumber),
      accountNumberLast4: lastCharacters(input.accountNumber),
      bankCode: input.bankCode || null,
      branchCode: input.branchCode || null,
      isPrimary: input.isPrimary,
      effectiveFrom: new Date(input.effectiveFrom),
      createdBy: actor.id,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.EMPLOYEE_BANK_INFO_CHANGED,
    entityType: "Employee",
    entityId: input.employeeId,
    metadata: { change: "bank_account_added", bankName: input.bankName },
  });

  return account;
}
