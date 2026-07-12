import { z } from "zod";
import { strongPasswordSchema } from "@/lib/validation/password";

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").max(255).trim(),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(128, "Password is too long."),
  callbackUrl: z.string().max(2048).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  newPassword: strongPasswordSchema,
  confirmPassword: z.string().min(1, "Confirm your new password."),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const securityPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: strongPasswordSchema,
  confirmPassword: z.string().min(1, "Confirm your new password."),
});

export type SecurityPasswordChangeInput = z.infer<
  typeof securityPasswordChangeSchema
>;

export const adminResetPasswordSchema = z.object({
  userId: z.uuid(),
  reason: z.string().trim().min(3, "A reason is required.").max(500),
});

export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
