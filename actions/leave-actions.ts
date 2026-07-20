"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireUser, requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import {
  createLeaveRequestSchema,
  cancelLeaveRequestSchema,
  adjustLeaveBalanceSchema,
} from "@/lib/validation/leave";
import * as leaveService from "@/lib/services/leave-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

async function getRequestMeta() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  return {
    ipAddress: forwardedFor ? forwardedFor.split(",")[0].trim() : null,
    userAgent: headerList.get("user-agent"),
  };
}

export async function createLeaveRequestAction(input: unknown): Promise<ActionResult> {
  // Self-service, identity-based — same exception pattern as checkInAction.
  const actor = await requireUser();
  const parsed = createLeaveRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const meta = await getRequestMeta();
    const request = await leaveService.createLeaveRequest(actor, parsed.data, meta);
    revalidatePath("/leave");
    return { ok: true, data: request };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function cancelLeaveRequestAction(input: unknown): Promise<ActionResult> {
  const actor = await requireUser();
  const parsed = cancelLeaveRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };

  try {
    const meta = await getRequestMeta();
    const request = await leaveService.cancelLeaveRequest(actor, parsed.data.id, meta);
    revalidatePath("/leave");
    return { ok: true, data: request };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function adjustLeaveBalanceAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_LEAVE_MANAGE.code);
  const parsed = adjustLeaveBalanceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const meta = await getRequestMeta();
    const balance = await leaveService.adjustLeaveBalance(actor, parsed.data, meta);
    revalidatePath("/leave");
    return { ok: true, data: balance };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
