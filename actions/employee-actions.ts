"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { requirePermission, requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  changeEmploymentStatusSchema,
  offboardEmployeeSchema,
} from "@/lib/validation/employees";
import * as employeeService from "@/lib/services/employee-service";
import { changeEmploymentStatus } from "@/lib/services/employee-status-service";
import { offboardEmployee } from "@/lib/services/employee-offboarding-service";
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

export async function createEmployeeAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_EMPLOYEE_CREATE.code);
  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const meta = await getRequestMeta();
    const employee = await employeeService.createEmployee(actor, parsed.data, meta);
    revalidatePath("/employees");
    return { ok: true, data: employee };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function updateEmployeeAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_EMPLOYEE_UPDATE.code);
  const parsed = updateEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const meta = await getRequestMeta();
    const employee = await employeeService.updateEmployee(actor, parsed.data, meta);
    revalidatePath("/employees");
    revalidatePath(`/employees/${parsed.data.id}`);
    return { ok: true, data: employee };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function changeEmploymentStatusAction(
  input: unknown
): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_EMPLOYEE_DEACTIVATE.code);
  const parsed = changeEmploymentStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const meta = await getRequestMeta();
    const employee = await changeEmploymentStatus(actor, parsed.data, meta);
    revalidatePath(`/employees/${parsed.data.employeeId}`);
    return { ok: true, data: employee };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function offboardEmployeeAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_EMPLOYEE_OFFBOARD.code);
  const parsed = offboardEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const meta = await getRequestMeta();
    const result = await offboardEmployee(actor, parsed.data, meta);
    revalidatePath("/employees");
    revalidatePath(`/employees/${parsed.data.employeeId}`);
    return { ok: true, data: result };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function revealSensitiveFieldAction(input: {
  employeeId: string;
  field: "nationalId" | "passport";
}): Promise<ActionResult<{ value: string }>> {
  // No requirePermission gate here — self-access (an employee viewing
  // their own record) is identity-based, not permission-based. The
  // service itself re-derives access (self OR HR.EMPLOYEE.VIEW_SENSITIVE)
  // before decrypting anything.
  const actor = await requireUser();
  try {
    const meta = await getRequestMeta();
    const value = await employeeService.revealSensitiveField(
      actor,
      input.employeeId,
      input.field,
      meta
    );
    return { ok: true, data: { value } };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
