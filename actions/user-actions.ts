"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import {
  createUserSchema,
  updateUserSchema,
  assignRoleSchema,
  setUserActiveSchema,
} from "@/lib/validation/users";
import { adminResetPasswordSchema } from "@/lib/validation/auth";
import * as userService from "@/lib/services/user-service";
import { adminResetPassword } from "@/lib/services/password-reset-service";
import { isAppError } from "@/lib/errors";

type CreateUserResult = Awaited<ReturnType<typeof userService.createUser>>;

async function getRequestMeta() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  return {
    ipAddress: forwardedFor ? forwardedFor.split(",")[0].trim() : null,
    userAgent: headerList.get("user-agent"),
  };
}

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export async function createUserAction(
  input: unknown
): Promise<ActionResult<CreateUserResult>> {
  return withTenantPermission(PERMISSIONS.USERS_CREATE.code, async (actor) => {
    const parsed = createUserSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    try {
      const meta = await getRequestMeta();
      const result = await userService.createUser(actor, parsed.data, meta);
      revalidatePath("/administration/users");
      return { ok: true, data: result };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function resetUserPasswordAction(
  input: unknown
): Promise<ActionResult<{ temporaryPassword: string }>> {
  return withTenantPermission(PERMISSIONS.USERS_RESET_PASSWORD.code, async (actor) => {
    const parsed = adminResetPasswordSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    try {
      const meta = await getRequestMeta();
      const result = await adminResetPassword(
        actor,
        parsed.data.userId,
        parsed.data.reason,
        meta
      );
      revalidatePath("/administration/users");
      return { ok: true, data: { temporaryPassword: result.temporaryPassword } };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function updateUserAction(
  input: unknown
): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.USERS_UPDATE.code, async (actor) => {
    const parsed = updateUserSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    try {
      const meta = await getRequestMeta();
      await userService.updateUser(actor, parsed.data, meta);
      revalidatePath("/administration/users");
      return { ok: true, data: undefined };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function assignRoleAction(
  input: unknown
): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.USERS_ASSIGN_ROLE.code, async (actor) => {
    const parsed = assignRoleSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    try {
      const meta = await getRequestMeta();
      await userService.assignRole(actor, parsed.data, meta);
      revalidatePath("/administration/users");
      return { ok: true, data: undefined };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function setUserActiveAction(
  input: unknown
): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.USERS_DEACTIVATE.code, async (actor) => {
    const parsed = setUserActiveSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }

    try {
      const meta = await getRequestMeta();
      await userService.setUserActive(actor, parsed.data, meta);
      revalidatePath("/administration/users");
      return { ok: true, data: undefined };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
