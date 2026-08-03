"use server";

import { revalidatePath } from "next/cache";
import { withTenantPermission, withTenantUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { createTaskSchema, updateTaskStatusSchema, updateTaskProgressSchema } from "@/lib/validation/tasks";
import { createTask, updateTaskStatus, updateTaskProgress } from "@/lib/services/task-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function createTaskAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PROJECTS_TASK_MANAGE.code, async (actor) => {
    const parsed = createTaskSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const task = await createTask(actor, parsed.data);
      revalidatePath(`/projects/${parsed.data.projectId}`);
      revalidatePath("/tasks");
      return { ok: true, data: task };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

/** No permission gate — a task's assignee may self-advance it
 * (TODO/IN_PROGRESS/DONE only); broader status changes require
 * PROJECTS_TASK_MANAGE, enforced inside task-service.ts's updateTaskStatus. */
export async function updateTaskStatusAction(input: unknown): Promise<ActionResult> {
  return withTenantUser(async (actor) => {
    const parsed = updateTaskStatusSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const task = await updateTaskStatus(actor, parsed.data);
      revalidatePath(`/projects/${task.projectId}`);
      revalidatePath("/tasks");
      return { ok: true, data: task };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

/** Same self-vs-managed shape as updateTaskStatusAction — the assignee may
 * update their own task's percentComplete; anyone else needs
 * PROJECTS_WBS_MANAGE, enforced inside task-service.ts. */
export async function updateTaskProgressAction(input: unknown): Promise<ActionResult> {
  return withTenantUser(async (actor) => {
    const parsed = updateTaskProgressSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const task = await updateTaskProgress(actor, parsed.data);
      revalidatePath(`/projects/${task.projectId}`);
      return { ok: true, data: task };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
