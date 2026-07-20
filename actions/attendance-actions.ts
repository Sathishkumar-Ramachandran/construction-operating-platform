"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAnyPermission, requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { correctAttendanceSchema } from "@/lib/validation/attendance";
import * as attendanceService from "@/lib/services/attendance-service";
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

export async function checkInAction(): Promise<ActionResult> {
  // No requirePermission gate — checking in is self-service and
  // identity-based, matching revealSensitiveFieldAction's exception
  // pattern. The service resolves the caller's own linked employee.
  const actor = await requireUser();
  try {
    const meta = await getRequestMeta();
    const record = await attendanceService.checkIn(actor, meta);
    revalidatePath("/attendance");
    return { ok: true, data: record };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function checkOutAction(): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    const meta = await getRequestMeta();
    const record = await attendanceService.checkOut(actor, meta);
    revalidatePath("/attendance");
    return { ok: true, data: record };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

/** Reachable by HR_ATTENDANCE_MANAGE (org-wide, HR/Admin) or
 * PROJECTS_TEAM_MANAGE (Managers, project-scoped) — the fine-grained
 * per-employee check happens inside correctAttendance's
 * assertCanMarkAttendanceForEmployee, same "narrow gate here, real check in
 * the service" shape used for allocation actions. */
export async function correctAttendanceAction(input: unknown): Promise<ActionResult> {
  const actor = await requireAnyPermission([
    PERMISSIONS.HR_ATTENDANCE_MANAGE.code,
    PERMISSIONS.PROJECTS_TEAM_MANAGE.code,
  ]);
  const parsed = correctAttendanceSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const meta = await getRequestMeta();
    const record = await attendanceService.correctAttendance(actor, parsed.data, meta);
    revalidatePath("/attendance");
    revalidatePath(`/employees/${parsed.data.employeeId}`);
    return { ok: true, data: record };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
