"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import {
  changePassword,
  type ChangePasswordFormState,
} from "@/actions/auth-actions";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: ChangePasswordFormState = undefined;

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePassword, initialState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.message ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          <span>{state.message}</span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          required
          aria-invalid={state?.errors?.newPassword ? true : undefined}
        />
        {state?.errors?.newPassword ? (
          <p className="text-xs text-destructive">
            {state.errors.newPassword[0]}
          </p>
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
          name="confirmPassword"
          autoComplete="new-password"
          required
          aria-invalid={state?.errors?.confirmPassword ? true : undefined}
        />
        {state?.errors?.confirmPassword ? (
          <p className="text-xs text-destructive">
            {state.errors.confirmPassword[0]}
          </p>
        ) : null}
      </div>

      <SubmitButton className="w-full" pendingLabel="Saving…">
        Save password
      </SubmitButton>
    </form>
  );
}
