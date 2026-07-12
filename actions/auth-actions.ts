"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  loginSchema,
  changePasswordSchema,
  securityPasswordChangeSchema,
} from "@/lib/validation/auth";
import {
  authenticateUser,
  createSession,
  destroySessionByToken,
  recordLastLogin,
  changeOwnPassword,
  changeOwnPasswordVerified,
  getSessionUser,
} from "@/lib/services/auth-service";
import {
  setSessionCookie,
  clearSessionCookie,
  getSessionCookieValue,
} from "@/lib/auth/session-cookie";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { getSafeRedirectPath } from "@/lib/redirect";
import { requireUser } from "@/lib/auth/guards";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

async function getRequestMeta() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : null;
  const userAgent = headerList.get("user-agent");
  return { ipAddress, userAgent };
}

export type LoginFormState =
  | {
      errors?: { email?: string[]; password?: string[] };
      message?: string;
    }
  | undefined;

export async function login(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    callbackUrl: formData.get("callbackUrl") ?? undefined,
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { ipAddress, userAgent } = await getRequestMeta();
  const outcome = await authenticateUser(parsed.data.email, parsed.data.password);

  if (!outcome.ok) {
    await recordAuditLog(db, {
      action: AuditAction.AUTH_LOGIN_FAILED,
      entityType: "User",
      metadata: { reason: outcome.auditCode, email: parsed.data.email.trim().toLowerCase() },
      ipAddress,
      userAgent,
    });
    return { message: "Invalid email or password." };
  }

  const session = await createSession(outcome.user.id, { ipAddress, userAgent });
  await setSessionCookie(session.token, session.expiresAt);
  await recordLastLogin(outcome.user.id);
  await recordAuditLog(db, {
    userId: outcome.user.id,
    action: AuditAction.AUTH_LOGIN_SUCCESS,
    entityType: "User",
    entityId: outcome.user.id,
    ipAddress,
    userAgent,
  });

  const destination = outcome.user.mustChangePassword
    ? "/change-password"
    : getSafeRedirectPath(parsed.data.callbackUrl);

  redirect(destination);
}

export async function logout(): Promise<void> {
  const token = await getSessionCookieValue();
  const user = token ? await getSessionUser(token) : null;

  if (token) {
    await destroySessionByToken(token);
  }
  await clearSessionCookie();

  if (user) {
    const { ipAddress, userAgent } = await getRequestMeta();
    await recordAuditLog(db, {
      userId: user.id,
      action: AuditAction.AUTH_LOGOUT,
      entityType: "User",
      entityId: user.id,
      ipAddress,
      userAgent,
    });
  }

  redirect("/login");
}

export type ChangePasswordFormState =
  | {
      errors?: { newPassword?: string[]; confirmPassword?: string[] };
      message?: string;
    }
  | undefined;

export async function changePassword(
  _prevState: ChangePasswordFormState,
  formData: FormData
): Promise<ChangePasswordFormState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { errors: { confirmPassword: ["Passwords do not match."] } };
  }

  await changeOwnPassword(user.id, parsed.data.newPassword);
  redirect("/dashboard");
}

export async function changeSecurityPasswordAction(
  input: unknown
): Promise<ActionResult<{ sessionsRevoked: number }>> {
  const user = await requireUser();
  const parsed = securityPasswordChangeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { ok: false, message: "Passwords do not match." };
  }

  const token = await getSessionCookieValue();
  if (!token) {
    return { ok: false, message: "Your session has expired. Please sign in again." };
  }

  try {
    const result = await changeOwnPasswordVerified(
      user.id,
      parsed.data.currentPassword,
      parsed.data.newPassword,
      token
    );
    return { ok: true, data: result };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
