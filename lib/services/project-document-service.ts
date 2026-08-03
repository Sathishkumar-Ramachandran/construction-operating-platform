import { db, type Db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { requestGenericDocumentUploadUrl, assertDocumentTypeAppliesToScope } from "@/lib/services/document-service";
import { getDownloadUrl } from "@/lib/services/storage-service";
import { hasPermission } from "@/lib/services/authorization-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

/** Documents attached to a Project (post-conversion) or a Lead
 * (pre-conversion) — exactly one of the two ids is passed; see
 * ProjectDocument's doc comment in schema.prisma for why this is one
 * shared table rather than two. */
export async function listDocumentsFor(scope: { projectId?: string; leadId?: string }) {
  return db.projectDocument.findMany({
    where: { projectId: scope.projectId, leadId: scope.leadId, status: { not: "ARCHIVED" } },
    include: { documentType: { select: { id: true, code: true, name: true, isConfidential: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function requestProjectDocumentUploadUrl(input: {
  projectId?: string;
  leadId?: string;
  documentTypeId: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
}) {
  const entityId = input.projectId ?? input.leadId;
  if (!entityId) throw new AppError(ErrorCode.VALIDATION_ERROR);
  return requestGenericDocumentUploadUrl({
    storagePathPrefix: "project-documents",
    entityId,
    documentTypeId: input.documentTypeId,
    originalFileName: input.originalFileName,
    mimeType: input.mimeType,
    fileSizeBytes: input.fileSizeBytes,
    scope: "PROJECT",
  });
}

export async function confirmProjectDocumentUpload(
  actor: AuthenticatedUser,
  input: {
    projectId?: string;
    leadId?: string;
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
  await assertDocumentTypeAppliesToScope(input.documentTypeId, "PROJECT");

  const document = await db.projectDocument.create({
    data: {
      projectId: input.projectId || null,
      leadId: input.leadId || null,
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
    action: AuditAction.PROJECT_DOCUMENT_UPLOADED,
    entityType: "ProjectDocument",
    entityId: document.id,
    afterData: { projectId: input.projectId, leadId: input.leadId, fileName: input.originalFileName },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return document;
}

export async function getProjectDocumentDownloadUrl(actor: AuthenticatedUser, documentId: string) {
  const document = await db.projectDocument.findUnique({ where: { id: documentId } });
  if (!document) throw new AppError(ErrorCode.PROJECT_DOCUMENT_NOT_FOUND);

  if (document.isConfidential) {
    const canView = await hasPermission(actor, PERMISSIONS.PROJECTS_DOCUMENTS_MANAGE.code);
    if (!canView) throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);
  }

  return getDownloadUrl(document.storageKey);
}

export async function archiveProjectDocument(actor: AuthenticatedUser, documentId: string) {
  const document = await db.projectDocument.update({
    where: { id: documentId },
    data: { status: "ARCHIVED" },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.PROJECT_DOCUMENT_ARCHIVED,
    entityType: "ProjectDocument",
    entityId: document.id,
  });

  return document;
}

/** Called once, inside the same transaction as lead-conversion-service.ts's
 * convertLeadToProject — flips every document from leadId to projectId
 * rather than copying rows, so there is exactly one document history
 * spanning the pre- and post-conversion stages. */
export async function reassignLeadDocumentsToProject(
  tx: Db,
  leadId: string,
  projectId: string
) {
  await tx.projectDocument.updateMany({
    where: { leadId },
    data: { projectId, leadId: null },
  });
}
