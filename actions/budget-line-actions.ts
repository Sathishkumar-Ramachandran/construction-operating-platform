"use server";

import { revalidatePath } from "next/cache";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { setBudgetLineSchema } from "@/lib/validation/projects";
import * as budgetLineService from "@/lib/services/budget-line-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function setBudgetLineAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PROJECTS_BUDGET_MANAGE.code, async (actor) => {
    const parsed = setBudgetLineSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const line = await budgetLineService.setBudgetLine(actor, parsed.data);
      revalidatePath(`/projects/${parsed.data.projectId}`);
      return { ok: true, data: line };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function deleteBudgetLineAction(id: string, projectId: string): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PROJECTS_BUDGET_MANAGE.code, async () => {
    try {
      await budgetLineService.deleteBudgetLine(id);
      revalidatePath(`/projects/${projectId}`);
      return { ok: true, data: null };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
