"use client";

import { useActionState } from "react";
import { AlertCircle } from "lucide-react";
import { login, type LoginFormState } from "@/actions/auth-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";

const initialState: LoginFormState = undefined;

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, formAction] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}

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
          placeholder="you@excellenterprises.com"
          required
          aria-invalid={state?.errors?.email ? true : undefined}
        />
        {state?.errors?.email ? (
          <p className="text-xs text-destructive">{state.errors.email[0]}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <span className="text-xs text-muted-foreground">
            Forgot password? Coming soon
          </span>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={state?.errors?.password ? true : undefined}
        />
        {state?.errors?.password ? (
          <p className="text-xs text-destructive">
            {state.errors.password[0]}
          </p>
        ) : null}
      </div>

      <SubmitButton className="w-full" pendingLabel="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}
