import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { requestGenericDocumentUploadUrl, assertDocumentTypeAppliesToScope } from "@/lib/services/document-service";
import { getDownloadUrl } from "@/lib/services/storage-service";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

export async function listDocumentsFor(scope: { supplierId?: string; purchaseOrderId?: string }) {
  return db.supplierDocument.findMany({
    where: { supplierId: scope.supplierId, purchaseOrderId: scope.purchaseOrderId, status: { not: "ARCHIVED" } },
    include: { documentType: { select: { id: true, code: true, name: true, isConfidential: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function requestSupplierDocumentUploadUrl(input: {
  supplierId?: string;
  purchaseOrderId?: string;
  documentTypeId: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
}) {
  const entityId = input.supplierId ?? input.purchaseOrderId;
  if (!entityId) throw new AppError(ErrorCode.VALIDATION_ERROR);
  return requestGenericDocumentUploadUrl({
    storagePathPrefix: "supplier-documents",
    entityId,
    documentTypeId: input.documentTypeId,
    originalFileName: input.originalFileName,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    scope: "SUPPLIER",
  });
}

export async function confirmSupplierDocumentUpload(
  actor: AuthenticatedUser,
  input: {
    supplierId?: string;
    purchaseOrderId?: string;
    documentTypeId: string;
    storageKey: string;
    originalFileName: string;
    mimeType: string;
    fileSizeBytes: number;
    checksum: string;
    isConfidential: boolean;
  },
  meta: ActorMeta = {}
) {
  await assertDocumentTypeAppliesToScope(input.documentTypeId, "SUPPLIER");

  const document = await db.supplierDocument.create({
    data: {
      supplierId: input.supplierId || null,
      purchaseOrderId: input.purchaseOrderId || null,
      documentTypeId: input.documentTypeId,
      storageKey: input.storageKey,
      originalFileName: input.originalFileName,
      mimeType: input.mimeType,
      fileSizeBytes: input.fileSizeBytes,
      checksum: input.checksum,
      isConfidential: input.isConfidential,
      status: "UPLOADED",
      createdBy: actor.id,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.DOCUMENT_UPLOADED,
    entityType: "SupplierDocument",
    entityId: document.id,
    afterData: { supplierId: input.supplierId, purchaseOrderId: input.purchaseOrderId, fileName: input.originalFileName },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return document;
}

export async function getSupplierDocumentDownloadUrl(documentId: string) {
  const document = await db.supplierDocument.findUnique({ where: { id: documentId } });
  if (!document) throw new AppError(ErrorCode.NOT_FOUND);
  return getDownloadUrl(document.storageKey);
}

export async function archiveSupplierDocument(actor: AuthenticatedUser, documentId: string) {
  const document = await db.supplierDocument.update({ where: { id: documentId }, data: { status: "ARCHIVED" } });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.DOCUMENT_ARCHIVED,
    entityType: "SupplierDocument",
    entityId: document.id,
  });
  return document;
}
