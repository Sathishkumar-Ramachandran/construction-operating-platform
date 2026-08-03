import Image from "next/image";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin-guards";
import { platformAdminLogout } from "@/actions/platform-admin-actions";
import { Button } from "@/components/ui/button";

export default async function PlatformAdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/platform-admin" className="flex items-center gap-3">
            <Image
              src="/Logo.png"
              alt="Excell Enterprises"
              width={32}
              height={32}
              className="size-8 rounded-lg object-contain"
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">Platform Admin</p>
              <p className="text-xs text-muted-foreground">{admin.name}</p>
            </div>
          </Link>
          <form action={platformAdminLogout}>
            <Button type="submit" variant="outline" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1 bg-muted/20 px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">{children}</div>
      </main>
    </div>
  );
}
