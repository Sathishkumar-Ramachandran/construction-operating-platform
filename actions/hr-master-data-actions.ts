"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import {
  departmentSchema,
  designationSchema,
  employmentGradeSchema,
  employmentTypeSchema,
  projectRoleSchema,
  documentTypeSchema,
  certificationTypeSchema,
  toggleActiveSchema,
} from "@/lib/validation/hr-master-data";
import { shiftTypeSchema, holidaySchema } from "@/lib/validation/attendance";
import { leaveTypeSchema } from "@/lib/validation/leave";
import * as masterData from "@/lib/services/hr-master-data-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

function revalidateSettings() {
  revalidatePath("/hr-settings");
}

export async function saveDepartmentAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = departmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const department = parsed.data.id
      ? await masterData.updateDepartment(actor, { ...parsed.data, id: parsed.data.id })
      : await masterData.createDepartment(actor, parsed.data);
    revalidateSettings();
    return { ok: true, data: department };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function setDepartmentActiveAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = toggleActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };
  try {
    const department = await masterData.setDepartmentActive(actor, parsed.data.id, parsed.data.isActive);
    revalidateSettings();
    return { ok: true, data: department };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function saveDesignationAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = designationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const designation = parsed.data.id
      ? await masterData.updateDesignation(actor, { ...parsed.data, id: parsed.data.id })
      : await masterData.createDesignation(actor, parsed.data);
    revalidateSettings();
    return { ok: true, data: designation };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function setDesignationActiveAction(input: unknown): Promise<ActionResult> {
  await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = toggleActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };
  const designation = await masterData.setDesignationActive(parsed.data.id, parsed.data.isActive);
  revalidateSettings();
  return { ok: true, data: designation };
}

export async function saveEmploymentGradeAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = employmentGradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const grade = parsed.data.id
      ? await masterData.updateEmploymentGrade(actor, { ...parsed.data, id: parsed.data.id })
      : await masterData.createEmploymentGrade(actor, parsed.data);
    revalidateSettings();
    return { ok: true, data: grade };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function setEmploymentGradeActiveAction(input: unknown): Promise<ActionResult> {
  await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = toggleActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };
  const grade = await masterData.setEmploymentGradeActive(parsed.data.id, parsed.data.isActive);
  revalidateSettings();
  return { ok: true, data: grade };
}

export async function saveEmploymentTypeAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = employmentTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const type = parsed.data.id
      ? await masterData.updateEmploymentType(actor, { ...parsed.data, id: parsed.data.id })
      : await masterData.createEmploymentType(actor, parsed.data);
    revalidateSettings();
    return { ok: true, data: type };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function setEmploymentTypeActiveAction(input: unknown): Promise<ActionResult> {
  await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = toggleActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };
  const type = await masterData.setEmploymentTypeActive(parsed.data.id, parsed.data.isActive);
  revalidateSettings();
  return { ok: true, data: type };
}

export async function saveProjectRoleAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = projectRoleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const role = parsed.data.id
      ? await masterData.updateProjectRole(actor, { ...parsed.data, id: parsed.data.id })
      : await masterData.createProjectRole(actor, parsed.data);
    revalidateSettings();
    return { ok: true, data: role };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function setProjectRoleActiveAction(input: unknown): Promise<ActionResult> {
  await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = toggleActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };
  const role = await masterData.setProjectRoleActive(parsed.data.id, parsed.data.isActive);
  revalidateSettings();
  return { ok: true, data: role };
}

export async function saveDocumentTypeAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = documentTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const type = parsed.data.id
      ? await masterData.updateDocumentType(actor, { ...parsed.data, id: parsed.data.id })
      : await masterData.createDocumentType(actor, parsed.data);
    revalidateSettings();
    return { ok: true, data: type };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function setDocumentTypeActiveAction(input: unknown): Promise<ActionResult> {
  await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = toggleActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };
  const type = await masterData.setDocumentTypeActive(parsed.data.id, parsed.data.isActive);
  revalidateSettings();
  return { ok: true, data: type };
}

export async function saveCertificationTypeAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = certificationTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const type = parsed.data.id
      ? await masterData.updateCertificationType(actor, { ...parsed.data, id: parsed.data.id })
      : await masterData.createCertificationType(actor, parsed.data);
    revalidateSettings();
    return { ok: true, data: type };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function setCertificationTypeActiveAction(input: unknown): Promise<ActionResult> {
  await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = toggleActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };
  const type = await masterData.setCertificationTypeActive(parsed.data.id, parsed.data.isActive);
  revalidateSettings();
  return { ok: true, data: type };
}

export async function saveShiftTypeAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = shiftTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const shiftType = parsed.data.id
      ? await masterData.updateShiftType(actor, { ...parsed.data, id: parsed.data.id })
      : await masterData.createShiftType(actor, parsed.data);
    revalidateSettings();
    return { ok: true, data: shiftType };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function setShiftTypeActiveAction(input: unknown): Promise<ActionResult> {
  await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = toggleActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };
  const shiftType = await masterData.setShiftTypeActive(parsed.data.id, parsed.data.isActive);
  revalidateSettings();
  return { ok: true, data: shiftType };
}

export async function saveHolidayAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = holidaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const holiday = await masterData.createHoliday(actor, parsed.data);
    revalidateSettings();
    return { ok: true, data: holiday };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function deleteHolidayAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };
  try {
    await masterData.deleteHoliday(actor, parsed.data.id);
    revalidateSettings();
    return { ok: true, data: null };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function saveLeaveTypeAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = leaveTypeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const leaveType = parsed.data.id
      ? await masterData.updateLeaveType(actor, { ...parsed.data, id: parsed.data.id })
      : await masterData.createLeaveType(actor, parsed.data);
    revalidateSettings();
    return { ok: true, data: leaveType };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function setLeaveTypeActiveAction(input: unknown): Promise<ActionResult> {
  await requirePermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  const parsed = toggleActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };
  const leaveType = await masterData.setLeaveTypeActive(parsed.data.id, parsed.data.isActive);
  revalidateSettings();
  return { ok: true, data: leaveType };
}
