"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { createProjectSchema, createSiteSchema } from "@/lib/validation/projects";
import { createProject, createSite } from "@/lib/services/project-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function createProjectAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_ALLOCATION_MANAGE.code);
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const project = await createProject(actor, parsed.data);
    revalidatePath("/hr-settings");
    return { ok: true, data: project };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function createSiteAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_ALLOCATION_MANAGE.code);
  const parsed = createSiteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const site = await createSite(actor, parsed.data);
    revalidatePath("/hr-settings");
    return { ok: true, data: site };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
