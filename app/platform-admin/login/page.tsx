import Image from "next/image";
import { PlatformAdminLoginForm } from "@/app/platform-admin/login/login-form";

export default function PlatformAdminLoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/30 px-4 py-10">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image
            src="/Logo.png"
            alt="Excell Enterprises"
            width={56}
            height={56}
            className="size-14 rounded-xl object-contain"
            priority
          />
          <div className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Platform Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Cross-company control panel — internal use only.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <PlatformAdminLoginForm />
        </div>
      </div>
    </div>
  );
}
