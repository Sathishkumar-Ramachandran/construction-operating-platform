"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { createProgressClaimSchema } from "@/lib/validation/projects";
import * as progressClaimService from "@/lib/services/progress-claim-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function createProgressClaimAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.PROJECTS_PROGRESS_CLAIM_MANAGE.code);
  const parsed = createProgressClaimSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const claim = await progressClaimService.createProgressClaim(actor, parsed.data);
    revalidatePath(`/projects/${parsed.data.projectId}`);
    return { ok: true, data: claim };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function submitProgressClaimForCertificationAction(id: string, projectId: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.PROJECTS_PROGRESS_CLAIM_MANAGE.code);
  try {
    const claim = await progressClaimService.submitProgressClaimForCertification(actor, id);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: claim };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function markProgressClaimPaidAction(id: string, projectId: string): Promise<ActionResult> {
  await requirePermission(PERMISSIONS.PROJECTS_PROGRESS_CLAIM_CERTIFY.code);
  try {
    const claim = await progressClaimService.markProgressClaimPaid(id);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true, data: claim };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
