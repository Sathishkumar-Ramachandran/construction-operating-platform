"use server";

import { revalidatePath } from "next/cache";
import { withTenantPermission, withTenantUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { createResourceRequestSchema, cancelResourceRequestSchema } from "@/lib/validation/resource-requests";
import { createResourceRequest, cancelResourceRequest } from "@/lib/services/project-resource-request-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function createResourceRequestAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PROJECTS_RESOURCE_REQUEST_MANAGE.code, async (actor) => {
    const parsed = createResourceRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const request = await createResourceRequest(actor, parsed.data);
      revalidatePath(`/projects/${parsed.data.projectId}`);
      return { ok: true, data: request };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function cancelResourceRequestAction(input: unknown): Promise<ActionResult> {
  return withTenantUser(async (actor) => {
    const parsed = cancelResourceRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const request = await cancelResourceRequest(actor, parsed.data.id);
      revalidatePath(`/projects/${request.projectId}`);
      return { ok: true, data: request };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
