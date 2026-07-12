"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import {
  requestDocumentUploadUrl,
  confirmDocumentUpload,
  getDocumentDownloadUrl,
  archiveDocument,
} from "@/lib/services/employee-document-service";
import { createWorkPass, verifyWorkPass } from "@/lib/services/work-pass-service";
import { createCertification, verifyCertification } from "@/lib/services/certification-service";
import {
  createWorkPassSchema,
  createCertificationSchema,
  documentUploadRequestSchema,
  confirmDocumentUploadSchema,
} from "@/lib/validation/work-passes";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function requestDocumentUploadAction(
  input: unknown
): Promise<ActionResult<{ uploadUrl: string; storageKey: string }>> {
  await requirePermission(PERMISSIONS.HR_DOCUMENT_UPLOAD.code);
  const parsed = documentUploadRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const result = await requestDocumentUploadUrl(parsed.data);
    return { ok: true, data: result };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function confirmDocumentUploadAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_DOCUMENT_UPLOAD.code);
  const parsed = confirmDocumentUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const document = await confirmDocumentUpload(actor, parsed.data);
    revalidatePath(`/employees/${parsed.data.employeeId}`);
    return { ok: true, data: document };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function getDocumentDownloadUrlAction(
  documentId: string
): Promise<ActionResult<{ url: string }>> {
  const actor = await requirePermission(PERMISSIONS.HR_DOCUMENT_VIEW.code);
  try {
    const url = await getDocumentDownloadUrl(actor, documentId);
    return { ok: true, data: { url } };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function archiveDocumentAction(documentId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_DOCUMENT_DELETE.code);
  try {
    const document = await archiveDocument(actor, documentId);
    revalidatePath(`/employees/${document.employeeId}`);
    return { ok: true, data: document };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function createWorkPassAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_WORK_PASS_MANAGE.code);
  const parsed = createWorkPassSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const workPass = await createWorkPass(actor, parsed.data);
    revalidatePath(`/employees/${parsed.data.employeeId}`);
    return { ok: true, data: workPass };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function verifyWorkPassAction(workPassId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_WORK_PASS_MANAGE.code);
  try {
    const workPass = await verifyWorkPass(actor, workPassId);
    revalidatePath(`/employees/${workPass.employeeId}`);
    return { ok: true, data: workPass };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function createCertificationAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_CERTIFICATION_MANAGE.code);
  const parsed = createCertificationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  try {
    const certification = await createCertification(actor, parsed.data);
    revalidatePath(`/employees/${parsed.data.employeeId}`);
    return { ok: true, data: certification };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function verifyCertificationAction(certificationId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_CERTIFICATION_MANAGE.code);
  try {
    const certification = await verifyCertification(actor, certificationId);
    revalidatePath(`/employees/${certification.employeeId}`);
    return { ok: true, data: certification };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
