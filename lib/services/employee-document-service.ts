import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { DocumentStatus } from "@/lib/hr/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import {
  isStorageConfigured,
  buildDocumentStorageKey,
  getUploadUrl,
  getDownloadUrl,
} from "@/lib/services/storage-service";
import { hasPermission } from "@/lib/services/authorization-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

export async function listEmployeeDocuments(employeeId: string) {
  return db.employeeDocument.findMany({
    where: { employeeId },
    include: { documentType: { select: { id: true, code: true, name: true, isConfidential: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export type RequestUploadInput = {
  employeeId: string;
  documentTypeId: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
};

export async function requestDocumentUploadUrl(input: RequestUploadInput) {
  if (!isStorageConfigured()) {
    throw new AppError(ErrorCode.STORAGE_NOT_CONFIGURED);
  }

  const documentType = await db.documentType.findUnique({
    where: { id: input.documentTypeId },
  });
  if (!documentType) throw new AppError(ErrorCode.NOT_FOUND);

  if (!documentType.allowedMimeTypes.includes(input.mimeType)) {
    throw new AppError(ErrorCode.DOCUMENT_FILE_TYPE_NOT_ALLOWED);
  }
  if (input.fileSizeBytes > documentType.maximumFileSizeBytes) {
    throw new AppError(ErrorCode.DOCUMENT_FILE_TOO_LARGE);
  }

  const storageKey = buildDocumentStorageKey(input.employeeId, input.originalFileName);
  const uploadUrl = await getUploadUrl(storageKey, input.mimeType);

  return { uploadUrl, storageKey };
}

export type ConfirmUploadInput = {
  employeeId: string;
  documentTypeId: string;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
  checksum: string;
  issueDate?: string;
  expiryDate?: string;
  documentNumber?: string;
  issuingAuthority?: string;
};

export async function confirmDocumentUpload(
  actor: AuthenticatedUser,
  input: ConfirmUploadInput,
  meta: ActorMeta = {}
) {
  const documentType = await db.documentType.findUnique({
    where: { id: input.documentTypeId },
  });
  if (!documentType) throw new AppError(ErrorCode.NOT_FOUND);

  const document = await db.employeeDocument.create({
    data: {
      employeeId: input.employeeId,
      documentTypeId: input.documentTypeId,
      storageKey: input.storageKey,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      checksum: input.checksum,
      issueDate: input.issueDate ? new Date(input.issueDate) : null,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      documentNumber: input.documentNumber || null,
      issuingAuthority: input.issuingAuthority || null,
      isConfidential: documentType.isConfidential,
      status: DocumentStatus.UPLOADED,
      createdBy: actor.id,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.DOCUMENT_UPLOADED,
    entityType: "EmployeeDocument",
    entityId: document.id,
    afterData: { documentTypeId: input.documentTypeId, fileName: input.originalFileName },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return document;
}

export async function getDocumentDownloadUrl(
  actor: AuthenticatedUser,
  documentId: string,
  meta: ActorMeta = {}
): Promise<string> {
  const document = await db.employeeDocument.findUnique({ where: { id: documentId } });
  if (!document) throw new AppError(ErrorCode.NOT_FOUND);

  if (document.isConfidential) {
    const canViewConfidential = await hasPermission(
      actor,
      PERMISSIONS.HR_DOCUMENT_VIEW_CONFIDENTIAL.code
    );
    if (!canViewConfidential) throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);
  }

  const url = await getDownloadUrl(document.storageKey);

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.DOCUMENT_DOWNLOADED,
    entityType: "EmployeeDocument",
    entityId: document.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return url;
}

export type DocumentChecklistItem = {
  documentTypeId: string;
  documentTypeCode: string;
  documentTypeName: string;
  isConfidential: boolean;
  isMandatory: boolean;
  status: DocumentStatus | "MISSING";
  document: { id: string; originalFileName: string; expiryDate: Date | null } | null;
};

/**
 * Which documents this employee's designation requires, cross-referenced
 * against what's actually on file. Drives the "missing documents"
 * checklist on the employee profile — returns [] for designations with no
 * configured requirements rather than treating that as an error.
 */
export async function getEmployeeDocumentChecklist(
  employeeId: string
): Promise<DocumentChecklistItem[]> {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { designationId: true },
  });
  if (!employee?.designationId) return [];

  const requirements = await db.designationRequiredDocument.findMany({
    where: { designationId: employee.designationId },
    include: { documentType: { select: { id: true, code: true, name: true, isConfidential: true } } },
  });
  if (requirements.length === 0) return [];

  const documentTypeIds = requirements.map((requirement) => requirement.documentTypeId);
  const existingDocuments = await db.employeeDocument.findMany({
    where: {
      employeeId,
      documentTypeId: { in: documentTypeIds },
      status: { not: DocumentStatus.ARCHIVED },
    },
    orderBy: { createdAt: "desc" },
  });

  const latestByType = new Map<string, (typeof existingDocuments)[number]>();
  for (const document of existingDocuments) {
    if (!latestByType.has(document.documentTypeId)) {
      latestByType.set(document.documentTypeId, document);
    }
  }

  return requirements.map((requirement) => {
    const document = latestByType.get(requirement.documentTypeId) ?? null;
    return {
      documentTypeId: requirement.documentTypeId,
      documentTypeCode: requirement.documentType.code,
      documentTypeName: requirement.documentType.name,
      isConfidential: requirement.documentType.isConfidential,
      isMandatory: requirement.isMandatory,
      status: document ? (document.status as DocumentStatus) : "MISSING",
      document: document
        ? { id: document.id, originalFileName: document.originalFileName, expiryDate: document.expiryDate }
        : null,
    };
  });
}

export async function archiveDocument(actor: AuthenticatedUser, documentId: string) {
  const document = await db.employeeDocument.update({
    where: { id: documentId },
    data: { status: DocumentStatus.ARCHIVED },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.DOCUMENT_ARCHIVED,
    entityType: "EmployeeDocument",
    entityId: document.id,
  });

  return document;
}
