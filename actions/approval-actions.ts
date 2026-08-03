"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { decideApprovalSchema, cancelApprovalSchema } from "@/lib/validation/approvals";
import * as approvalService from "@/lib/services/approval-service";
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

export async function decideApprovalAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.APPROVALS_DECIDE.code, async (actor) => {
    const parsed = decideApprovalSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    try {
      const meta = await getRequestMeta();
      const request = await approvalService.decideApprovalStep(actor, parsed.data, meta);
      revalidatePath("/approvals");
      return { ok: true, data: request };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function cancelApprovalAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.APPROVALS_VIEW.code, async (actor) => {
    const parsed = cancelApprovalSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    try {
      const meta = await getRequestMeta();
      const request = await approvalService.cancelApprovalRequest(actor, parsed.data, meta);
      revalidatePath("/approvals");
      return { ok: true, data: request };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
