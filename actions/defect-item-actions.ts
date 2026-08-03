"use server";

import { revalidatePath } from "next/cache";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { createDefectItemSchema, changeDefectItemStatusSchema } from "@/lib/validation/projects";
import * as defectItemService from "@/lib/services/defect-item-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function createDefectItemAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PROJECTS_DEFECTS_MANAGE.code, async (actor) => {
    const parsed = createDefectItemSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const defect = await defectItemService.createDefectItem(actor, parsed.data);
      revalidatePath(`/projects/${parsed.data.projectId}`);
      return { ok: true, data: defect };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function changeDefectItemStatusAction(id: string, projectId: string, input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PROJECTS_DEFECTS_MANAGE.code, async (actor) => {
    const parsed = changeDefectItemStatusSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const defect = await defectItemService.changeDefectItemStatus(actor, id, parsed.data);
      revalidatePath(`/projects/${projectId}`);
      return { ok: true, data: defect };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
