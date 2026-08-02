"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { documentUploadRequestSchema, confirmDocumentUploadSchema } from "@/lib/validation/projects";
import * as projectDocumentService from "@/lib/services/project-document-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function requestProjectDocumentUploadAction(
  input: unknown
): Promise<ActionResult<{ uploadUrl: string; storageKey: string; isConfidential: boolean }>> {
  await requirePermission(PERMISSIONS.PROJECTS_DOCUMENTS_MANAGE.code);
  const parsed = documentUploadRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const result = await projectDocumentService.requestProjectDocumentUploadUrl(parsed.data);
    return { ok: true, data: result };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function confirmProjectDocumentUploadAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.PROJECTS_DOCUMENTS_MANAGE.code);
  const parsed = confirmDocumentUploadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const document = await projectDocumentService.confirmProjectDocumentUpload(actor, parsed.data);
    if (parsed.data.projectId) revalidatePath(`/projects/${parsed.data.projectId}`);
    if (parsed.data.leadId) revalidatePath(`/crm/leads/${parsed.data.leadId}`);
    return { ok: true, data: document };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function getProjectDocumentDownloadUrlAction(documentId: string): Promise<ActionResult<{ url: string }>> {
  const actor = await requirePermission(PERMISSIONS.PROJECTS_DOCUMENTS_VIEW.code);
  try {
    const url = await projectDocumentService.getProjectDocumentDownloadUrl(actor, documentId);
    return { ok: true, data: { url } };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function archiveProjectDocumentAction(documentId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.PROJECTS_DOCUMENTS_MANAGE.code);
  try {
    const document = await projectDocumentService.archiveProjectDocument(actor, documentId);
    if (document.projectId) revalidatePath(`/projects/${document.projectId}`);
    if (document.leadId) revalidatePath(`/crm/leads/${document.leadId}`);
    return { ok: true, data: document };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
