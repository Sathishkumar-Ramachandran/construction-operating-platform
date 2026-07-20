"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/guards";
import * as notificationService from "@/lib/services/notification-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const actor = await requireUser();
  try {
    await notificationService.markNotificationRead(actor, id);
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const actor = await requireUser();
  await notificationService.markAllNotificationsRead(actor);
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}
