"use server";

import { revalidatePath } from "next/cache";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { createLeadSchema, updateLeadSchema, changeLeadStatusSchema, convertLeadToProjectSchema } from "@/lib/validation/crm";
import * as leadService from "@/lib/services/lead-service";
import { convertLeadToProject } from "@/lib/services/lead-conversion-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function createLeadAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.CRM_LEADS_MANAGE.code, async (actor) => {
    const parsed = createLeadSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const lead = await leadService.createLead(actor, parsed.data);
      revalidatePath("/crm/leads");
      return { ok: true, data: lead };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function updateLeadAction(id: string, input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.CRM_LEADS_MANAGE.code, async (actor) => {
    const parsed = updateLeadSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const lead = await leadService.updateLead(actor, id, parsed.data);
      revalidatePath(`/crm/leads/${id}`);
      return { ok: true, data: lead };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function changeLeadStatusAction(id: string, input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.CRM_LEADS_MANAGE.code, async (actor) => {
    const parsed = changeLeadStatusSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const lead = await leadService.changeLeadStatus(actor, id, parsed.data);
      revalidatePath(`/crm/leads/${id}`);
      revalidatePath("/crm/leads");
      return { ok: true, data: lead };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function convertLeadToProjectAction(id: string, input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.CRM_LEADS_CONVERT.code, async (actor) => {
    const parsed = convertLeadToProjectSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const project = await convertLeadToProject(actor, id, parsed.data);
      revalidatePath(`/crm/leads/${id}`);
      revalidatePath("/projects");
      return { ok: true, data: project };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
