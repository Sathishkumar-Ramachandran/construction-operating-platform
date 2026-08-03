"use server";

import { revalidatePath } from "next/cache";
import { withTenantPermission, withTenantAnyPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { createAssignmentSchema, endAssignmentSchema, availabilityOverrideSchema } from "@/lib/validation/allocation";
import { createAssignment, endAssignment } from "@/lib/services/employee-allocation-service";
import { setAvailabilityOverride } from "@/lib/services/employee-availability-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function createAssignmentAction(input: unknown): Promise<ActionResult> {
  return withTenantAnyPermission(
    [PERMISSIONS.HR_ALLOCATION_MANAGE.code, PERMISSIONS.PROJECTS_TEAM_MANAGE.code],
    async (actor) => {
      const parsed = createAssignmentSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
      }
      try {
        const assignment = await createAssignment(actor, parsed.data);
        revalidatePath(`/employees/${parsed.data.employeeId}`);
        revalidatePath("/employees/availability");
        revalidatePath(`/projects/${parsed.data.projectId}`);
        return { ok: true, data: assignment };
      } catch (error) {
        if (isAppError(error)) return { ok: false, message: error.message };
        throw error;
      }
    }
  );
}

export async function endAssignmentAction(input: unknown): Promise<ActionResult> {
  return withTenantAnyPermission(
    [PERMISSIONS.HR_ALLOCATION_MANAGE.code, PERMISSIONS.PROJECTS_TEAM_MANAGE.code],
    async (actor) => {
      const parsed = endAssignmentSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
      }
      try {
        const assignment = await endAssignment(actor, parsed.data);
        revalidatePath("/employees/availability");
        revalidatePath(`/projects/${assignment.projectId}`);
        return { ok: true, data: assignment };
      } catch (error) {
        if (isAppError(error)) return { ok: false, message: error.message };
        throw error;
      }
    }
  );
}

export async function setAvailabilityOverrideAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.HR_ALLOCATION_MANAGE.code, async (actor) => {
    const parsed = availabilityOverrideSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    try {
      const override = await setAvailabilityOverride(actor, parsed.data);
      revalidatePath("/employees/availability");
      revalidatePath(`/employees/${parsed.data.employeeId}`);
      return { ok: true, data: override };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
