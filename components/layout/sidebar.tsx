import Image from "next/image";
import Link from "next/link";
import { NavList } from "@/components/layout/nav-list";
import { UserMenu } from "@/components/layout/user-menu";
import type { AuthenticatedUser } from "@/types/auth";

export function Sidebar({
  visibleHrefs,
  user,
}: {
  visibleHrefs: string[];
  user: AuthenticatedUser;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-sidebar-border px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image
            src="/Logo.png"
            alt="Excell Enterprises"
            width={32}
            height={32}
            className="size-8 rounded-md object-contain"
            priority
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">
              Excell Enterprises
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">
              Construction Operating Platform
            </p>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <NavList visibleHrefs={visibleHrefs} />
      </div>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        <UserMenu user={user} />
      </div>
    </aside>
  );
}
