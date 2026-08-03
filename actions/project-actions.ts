"use server";

import { revalidatePath } from "next/cache";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import {
  createProjectSchema,
  createSiteSchema,
  updateProjectSchema,
  activateProjectSchema,
  closeProjectSchema,
} from "@/lib/validation/projects";
import {
  createProject,
  createSite,
  updateProject,
  activateProject,
  closeProject,
} from "@/lib/services/project-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function createProjectAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PROJECTS_MANAGE.code, async (actor) => {
    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const project = await createProject(actor, parsed.data);
      revalidatePath("/hr-settings");
      revalidatePath("/projects");
      return { ok: true, data: project };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function updateProjectAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PROJECTS_MANAGE.code, async (actor) => {
    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const project = await updateProject(actor, parsed.data.id, parsed.data);
      revalidatePath("/projects");
      revalidatePath(`/projects/${parsed.data.id}`);
      return { ok: true, data: project };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function activateProjectAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PROJECTS_MANAGE.code, async (actor) => {
    const parsed = activateProjectSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const project = await activateProject(actor, parsed.data.id);
      revalidatePath("/projects");
      revalidatePath(`/projects/${parsed.data.id}`);
      return { ok: true, data: project };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function closeProjectAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PROJECTS_MANAGE.code, async (actor) => {
    const parsed = closeProjectSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const project = await closeProject(actor, parsed.data.id, parsed.data);
      revalidatePath("/projects");
      revalidatePath(`/projects/${parsed.data.id}`);
      return { ok: true, data: project };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function createSiteAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PROJECTS_MANAGE.code, async (actor) => {
    const parsed = createSiteSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const site = await createSite(actor, parsed.data);
      revalidatePath("/hr-settings");
      revalidatePath(`/projects/${parsed.data.projectId}`);
      return { ok: true, data: site };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
