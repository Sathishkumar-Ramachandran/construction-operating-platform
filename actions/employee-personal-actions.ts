"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { emergencyContactInputSchema, bankAccountInputSchema } from "@/lib/validation/employee-personal";
import { addEmergencyContact, addBankAccount } from "@/lib/services/employee-personal-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function addEmergencyContactAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_EMPLOYEE_UPDATE.code);
  const parsed = emergencyContactInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const contact = await addEmergencyContact(actor, parsed.data);
    revalidatePath(`/employees/${parsed.data.employeeId}`);
    return { ok: true, data: contact };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function addBankAccountAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_EMPLOYEE_VIEW_SENSITIVE.code);
  const parsed = bankAccountInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const account = await addBankAccount(actor, parsed.data);
    revalidatePath(`/employees/${parsed.data.employeeId}`);
    return { ok: true, data: account };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
