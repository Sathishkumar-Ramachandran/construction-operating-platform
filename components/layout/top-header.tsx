"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationBell } from "@/components/layout/notification-bell";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NAVIGATION } from "@/lib/authorization/navigation";
import type { AuthenticatedUser } from "@/types/auth";

function useCurrentPageTitle(pathname: string) {
  for (const group of NAVIGATION) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return item.title;
      }
    }
  }
  return "Dashboard";
}

export function TopHeader({
  visibleHrefs,
  user,
}: {
  visibleHrefs: string[];
  user: AuthenticatedUser;
}) {
  const pathname = usePathname();
  const title = useCurrentPageTitle(pathname);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
      <MobileNav visibleHrefs={visibleHrefs} user={user} />

      <h2 className="truncate text-base font-semibold text-foreground">
        {title}
      </h2>

      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-disabled
                className="hidden size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
              />
            }
          >
            <Search className="size-4" aria-hidden />
            <span className="sr-only">Search (coming soon)</span>
          </TooltipTrigger>
          <TooltipContent>Global search — coming soon</TooltipContent>
        </Tooltip>

        <NotificationBell />

        <div className="ml-1">
          <UserMenu user={user} compact />
        </div>
      </div>
    </header>
  );
}
