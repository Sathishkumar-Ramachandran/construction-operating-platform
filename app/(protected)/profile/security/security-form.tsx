"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/forms/password-input";
import { Button } from "@/components/ui/button";
import {
  securityPasswordChangeSchema,
  type SecurityPasswordChangeInput,
} from "@/lib/validation/auth";
import { changeSecurityPasswordAction } from "@/actions/auth-actions";

export function SecurityForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SecurityPasswordChangeInput>({
    resolver: zodResolver(securityPasswordChangeSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: SecurityPasswordChangeInput) {
    if (values.newPassword !== values.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    const result = await changeSecurityPasswordAction(values);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    reset();
    toast.success(
      result.data.sessionsRevoked > 0
        ? `Password changed. Signed out of ${result.data.sessionsRevoked} other session(s).`
        : "Password changed."
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <PasswordInput
          id="currentPassword"
          autoComplete="current-password"
          {...register("currentPassword")}
        />
        {errors.currentPassword ? (
          <p className="text-xs text-destructive">
            {errors.currentPassword.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <PasswordInput
          id="newPassword"
          autoComplete="new-password"
          {...register("newPassword")}
        />
        {errors.newPassword ? (
          <p className="text-xs text-destructive">{errors.newPassword.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            At least 10 characters, with upper and lower case, a number, and a
            special character.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <PasswordInput
          id="confirmPassword"
          autoComplete="new-password"
          {...register("confirmPassword")}
        />
        {errors.confirmPassword ? (
          <p className="text-xs text-destructive">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving…" : "Save password"}
      </Button>
    </form>
  );
}
