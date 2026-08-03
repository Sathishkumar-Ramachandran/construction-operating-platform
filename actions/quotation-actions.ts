"use server";

import { revalidatePath } from "next/cache";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { createQuotationSchema, changeQuotationStatusSchema } from "@/lib/validation/crm";
import * as quotationService from "@/lib/services/quotation-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function createQuotationAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.CRM_QUOTATIONS_MANAGE.code, async (actor) => {
    const parsed = createQuotationSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const quotation = await quotationService.createQuotation(actor, parsed.data);
      revalidatePath(`/crm/leads/${parsed.data.leadId}`);
      return { ok: true, data: quotation };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function changeQuotationStatusAction(id: string, leadId: string, input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.CRM_QUOTATIONS_MANAGE.code, async (actor) => {
    const parsed = changeQuotationStatusSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const quotation = await quotationService.changeQuotationStatus(actor, id, parsed.data);
      revalidatePath(`/crm/leads/${leadId}`);
      return { ok: true, data: quotation };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
