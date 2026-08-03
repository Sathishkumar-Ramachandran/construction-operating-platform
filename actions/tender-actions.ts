"use server";

import { revalidatePath } from "next/cache";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { tenderDetailsSchema, advanceTenderStatusSchema, setTenderBoqLinesSchema } from "@/lib/validation/crm";
import * as tenderService from "@/lib/services/tender-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function updateTenderDetailsAction(tenderId: string, leadId: string, input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.CRM_TENDERS_MANAGE.code, async (actor) => {
    const parsed = tenderDetailsSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const tender = await tenderService.updateTenderDetails(actor, tenderId, parsed.data);
      revalidatePath(`/crm/leads/${leadId}`);
      return { ok: true, data: tender };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function setTenderBoqLinesAction(tenderId: string, leadId: string, input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.CRM_TENDERS_MANAGE.code, async (actor) => {
    const parsed = setTenderBoqLinesSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const tender = await tenderService.setTenderBoqLines(actor, tenderId, parsed.data);
      revalidatePath(`/crm/leads/${leadId}`);
      return { ok: true, data: tender };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function advanceTenderStatusAction(tenderId: string, leadId: string, input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.CRM_TENDERS_MANAGE.code, async (actor) => {
    const parsed = advanceTenderStatusSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const tender = await tenderService.advanceTenderStatus(actor, tenderId, parsed.data);
      revalidatePath(`/crm/leads/${leadId}`);
      return { ok: true, data: tender };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
