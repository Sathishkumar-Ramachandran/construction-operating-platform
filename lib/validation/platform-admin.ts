import { z } from "zod";
import { strongPasswordSchema } from "@/lib/validation/password";

export const platformAdminLoginSchema = z.object({
  email: z.email("Enter a valid email address.").max(255).trim(),
  password: z.string().min(1, "Password is required.").max(128, "Password is too long."),
});

export type PlatformAdminLoginInput = z.infer<typeof platformAdminLoginSchema>;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const createCompanySchema = z.object({
  name: z.string().trim().min(2, "Company name is required.").max(200),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug is required.")
    .max(100)
    .regex(SLUG_PATTERN, "Use lowercase letters, numbers, and hyphens only (e.g. acme-builders)."),
  code: z.string().trim().max(50).optional().or(z.literal("")),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const setCompanyActiveSchema = z.object({
  companyId: z.uuid(),
  isActive: z.boolean(),
});

export type SetCompanyActiveInput = z.infer<typeof setCompanyActiveSchema>;

export const provisionFirstAdminSchema = z.object({
  companyId: z.uuid(),
  name: z.string().trim().min(2, "Name is required.").max(200),
  email: z.email("Enter a valid email address.").max(255).trim(),
});

export type ProvisionFirstAdminActionInput = z.infer<typeof provisionFirstAdminSchema>;

export const platformAdminChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: strongPasswordSchema,
  confirmPassword: z.string().min(1, "Confirm your new password."),
});

export type PlatformAdminChangePasswordInput = z.infer<
  typeof platformAdminChangePasswordSchema
>;
