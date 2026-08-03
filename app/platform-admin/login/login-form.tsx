"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import {
  platformAdminLogin,
  type PlatformAdminLoginFormState,
} from "@/actions/platform-admin-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: PlatformAdminLoginFormState = undefined;

export function PlatformAdminLoginForm() {
  const [state, formAction] = useActionState(platformAdminLogin, initialState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.message ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          <span>{state.message}</span>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="platform-admin@example.com"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </div>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
