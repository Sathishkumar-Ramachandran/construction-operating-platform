import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { WorkPassStatus } from "@/lib/hr/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import type { CreateWorkPassInput } from "@/lib/validation/work-passes";
import type { AuthenticatedUser } from "@/types/auth";

export async function listWorkPasses(employeeId: string) {
  return db.workPass.findMany({
    where: { employeeId },
    orderBy: { expiryDate: "asc" },
  });
}

export async function createWorkPass(
  actor: AuthenticatedUser,
  input: CreateWorkPassInput
) {
  const issueDate = new Date(input.issueDate);
  const expiryDate = new Date(input.expiryDate);
  if (expiryDate < issueDate) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Expiry date must be after the issue date.");
  }

  const workPass = await db.workPass.create({
    data: {
      employeeId: input.employeeId,
      passType: input.passType,
      passNumber: input.passNumber,
      issuingCountry: input.issuingCountry,
      issuingAuthority: input.issuingAuthority,
      issueDate,
      expiryDate,
      status: WorkPassStatus.VALID,
      notes: input.notes || null,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.WORK_PASS_CREATED,
    entityType: "WorkPass",
    entityId: workPass.id,
    afterData: { passType: workPass.passType, passNumber: workPass.passNumber },
  });

  return workPass;
}

export async function verifyWorkPass(actor: AuthenticatedUser, workPassId: string) {
  const workPass = await db.workPass.update({
    where: { id: workPassId },
    data: { verifiedBy: actor.id, verifiedAt: new Date() },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.WORK_PASS_UPDATED,
    entityType: "WorkPass",
    entityId: workPass.id,
    metadata: { action: "verified" },
  });

  return workPass;
}
