"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import { advanceSiteStageSchema, setSiteStageChecklistItemSchema } from "@/lib/validation/site-stages";
import { advanceSiteStage } from "@/lib/services/site-stage-service";
import { setChecklistItem } from "@/lib/services/site-stage-checklist-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

/** No permission gate — advancing a site's stage is relationship-scoped
 * (Manager, Admin, or an employee actively assigned to that exact site),
 * enforced inside site-stage-service.ts's assertCanAdvanceSiteStage. */
export async function advanceSiteStageAction(input: unknown): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = advanceSiteStageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const site = await advanceSiteStage(actor, parsed.data);
    revalidatePath(`/projects/${site.projectId}`);
    return { ok: true, data: site };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

/** No permission gate — same relationship-scoped rule as advanceSiteStageAction,
 * enforced inside site-stage-checklist-service.ts. */
export async function setSiteStageChecklistItemAction(input: unknown): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = setSiteStageChecklistItemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const checklist = await setChecklistItem(actor, parsed.data);
    return { ok: true, data: checklist };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
