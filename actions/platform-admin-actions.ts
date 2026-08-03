"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  platformAdminLoginSchema,
  createCompanySchema,
  setCompanyActiveSchema,
  provisionFirstAdminSchema,
} from "@/lib/validation/platform-admin";
import {
  authenticatePlatformAdmin,
  createPlatformAdminSession,
  recordPlatformAdminLastLogin,
  destroyPlatformAdminSessionByToken,
} from "@/lib/services/platform-admin-auth-service";
import {
  createCompany,
  setCompanyActive,
  provisionCompanyFirstAdmin,
} from "@/lib/services/platform-admin-service";
import {
  setPlatformAdminSessionCookie,
  clearPlatformAdminSessionCookie,
  getPlatformAdminSessionCookieValue,
} from "@/lib/auth/platform-admin-session-cookie";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin-guards";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export type PlatformAdminLoginFormState =
  | { message?: string }
  | undefined;

export async function platformAdminLogin(
  _prevState: PlatformAdminLoginFormState,
  formData: FormData
): Promise<PlatformAdminLoginFormState> {
  const parsed = platformAdminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const outcome = await authenticatePlatformAdmin(parsed.data.email, parsed.data.password);
  if (!outcome.ok) {
    return { message: "Invalid email or password." };
  }

  const session = await createPlatformAdminSession(outcome.admin.id);
  await setPlatformAdminSessionCookie(session.token, session.expiresAt);
  await recordPlatformAdminLastLogin(outcome.admin.id);

  redirect("/platform-admin");
}

export async function platformAdminLogout(): Promise<void> {
  const token = await getPlatformAdminSessionCookieValue();
  if (token) {
    await destroyPlatformAdminSessionByToken(token);
  }
  await clearPlatformAdminSessionCookie();
  redirect("/platform-admin/login");
}

export async function createCompanyAction(input: unknown): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();
  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const company = await createCompany(admin.id, {
      name: parsed.data.name,
      slug: parsed.data.slug,
      code: parsed.data.code || null,
    });
    revalidatePath("/platform-admin");
    return { ok: true, data: company };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function setCompanyActiveAction(input: unknown): Promise<ActionResult> {
  const admin = await requirePlatformAdmin();
  const parsed = setCompanyActiveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const company = await setCompanyActive(admin.id, parsed.data.companyId, parsed.data.isActive);
    revalidatePath("/platform-admin");
    revalidatePath(`/platform-admin/companies/${parsed.data.companyId}`);
    return { ok: true, data: company };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function provisionFirstAdminAction(
  input: unknown
): Promise<ActionResult<{ email: string; temporaryPassword: string }>> {
  const admin = await requirePlatformAdmin();
  const parsed = provisionFirstAdminSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const result = await provisionCompanyFirstAdmin(admin.id, parsed.data.companyId, {
      name: parsed.data.name,
      email: parsed.data.email,
    });
    revalidatePath(`/platform-admin/companies/${parsed.data.companyId}`);
    return {
      ok: true,
      data: { email: result.email, temporaryPassword: result.temporaryPassword },
    };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
