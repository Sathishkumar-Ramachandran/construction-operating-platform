"use server";

import { revalidatePath } from "next/cache";
import { withTenantUser } from "@/lib/auth/guards";
import * as notificationService from "@/lib/services/notification-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  return withTenantUser(async (actor) => {
    try {
      await notificationService.markNotificationRead(actor, id);
      revalidatePath("/", "layout");
      return { ok: true, data: null };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  return withTenantUser(async (actor) => {
    await notificationService.markAllNotificationsRead(actor);
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  });
}
