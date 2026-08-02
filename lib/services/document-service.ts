import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { isStorageConfigured, buildDocumentStorageKey, getUploadUrl } from "@/lib/services/storage-service";

/**
 * Generalized upload-request step shared by every document-attached entity
 * (Employees, Projects/Leads, Suppliers/PurchaseOrders) — the S3 presign +
 * DocumentType validation logic is identical regardless of which table the
 * confirmed row eventually lands in, so it's factored out here rather than
 * copied per entity. The "confirm" step (persisting the row) stays in each
 * entity's own service file (e.g. project-document-service.ts,
 * supplier-document-service.ts) since it writes to a different Prisma
 * model each time — Prisma's per-model typing doesn't generalize cleanly,
 * and forcing it through a generic delegate would trade real type safety
 * for a thin abstraction.
 */
export async function requestGenericDocumentUploadUrl(input: {
  storagePathPrefix: string; // e.g. "project-documents", "supplier-documents"
  entityId: string;
  documentTypeId: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
}) {
  if (!isStorageConfigured()) {
    throw new AppError(ErrorCode.STORAGE_NOT_CONFIGURED);
  }

  const documentType = await db.documentType.findUnique({ where: { id: input.documentTypeId } });
  if (!documentType) throw new AppError(ErrorCode.NOT_FOUND);

  if (!documentType.allowedMimeTypes.includes(input.mimeType)) {
    throw new AppError(ErrorCode.DOCUMENT_FILE_TYPE_NOT_ALLOWED);
  }
  if (input.fileSizeBytes > documentType.maximumFileSizeBytes) {
    throw new AppError(ErrorCode.DOCUMENT_FILE_TOO_LARGE);
  }

  const storageKey = buildDocumentStorageKey(input.storagePathPrefix, input.entityId, input.originalFileName);
  const uploadUrl = await getUploadUrl(storageKey, input.mimeType);

  return { uploadUrl, storageKey, isConfidential: documentType.isConfidential };
}
