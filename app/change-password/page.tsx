import { requireUser } from "@/lib/auth/guards";
import { ChangePasswordForm } from "@/app/change-password/change-password-form";

export default async function ChangePasswordPage() {
  const user = await requireUser();

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            {user.mustChangePassword ? "Set a new password" : "Change password"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.mustChangePassword
              ? "You must set a new password before continuing."
              : "Choose a strong, unique password for your account."}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
