import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { WorkPassStatus } from "@/lib/hr/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import type { CreateCertificationInput } from "@/lib/validation/work-passes";
import type { AuthenticatedUser } from "@/types/auth";

export async function listCertifications(employeeId: string) {
  return db.employeeCertification.findMany({
    where: { employeeId },
    include: { type: { select: { id: true, code: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCertification(
  actor: AuthenticatedUser,
  input: CreateCertificationInput
) {
  const type = await db.certificationType.findUnique({ where: { id: input.typeId } });
  if (!type) throw new AppError(ErrorCode.NOT_FOUND);

  const issueDate = new Date(input.issueDate);
  let expiryDate: Date | null = input.expiryDate ? new Date(input.expiryDate) : null;

  if (type.requiresExpiryDate && !expiryDate) {
    if (type.defaultValidityMonths) {
      expiryDate = new Date(issueDate);
      expiryDate.setMonth(expiryDate.getMonth() + type.defaultValidityMonths);
    } else {
      throw new AppError(ErrorCode.VALIDATION_ERROR, "This certification type requires an expiry date.");
    }
  }
  if (expiryDate && expiryDate < issueDate) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, "Expiry date must be after the issue date.");
  }

  const certification = await db.employeeCertification.create({
    data: {
      employeeId: input.employeeId,
      typeId: input.typeId,
      licenceNumber: input.licenceNumber,
      issuingAuthority: input.issuingAuthority,
      issueDate,
      expiryDate,
      status: WorkPassStatus.VALID,
      notes: input.notes || null,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.CERTIFICATION_CREATED,
    entityType: "EmployeeCertification",
    entityId: certification.id,
    afterData: { typeId: input.typeId, licenceNumber: input.licenceNumber },
  });

  return certification;
}

export async function verifyCertification(actor: AuthenticatedUser, certificationId: string) {
  const certification = await db.employeeCertification.update({
    where: { id: certificationId },
    data: { verifiedBy: actor.id, verifiedAt: new Date() },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.CERTIFICATION_UPDATED,
    entityType: "EmployeeCertification",
    entityId: certification.id,
    metadata: { action: "verified" },
  });

  return certification;
}
