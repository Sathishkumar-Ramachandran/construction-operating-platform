import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UnauthorizedState() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-7 text-destructive" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold text-foreground">
          You don&apos;t have access to this page
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your account role doesn&apos;t include permission to view this
          resource. Contact your administrator if you believe this is a
          mistake.
        </p>
      </div>
      <Button
        size="sm"
        nativeButton={false}
        render={<Link href="/dashboard">Back to dashboard</Link>}
      />
    </div>
  );
}
