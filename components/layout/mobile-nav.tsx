"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavList } from "@/components/layout/nav-list";
import { UserMenu } from "@/components/layout/user-menu";
import type { AuthenticatedUser } from "@/types/auth";

export function MobileNav({
  visibleHrefs,
  user,
}: {
  visibleHrefs: string[];
  user: AuthenticatedUser;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="lg:hidden" />
        }
      >
        <Menu className="size-5" aria-hidden />
        <span className="sr-only">Open navigation</span>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="flex w-72 flex-col bg-sidebar p-0 text-sidebar-foreground"
      >
        <SheetHeader className="flex-row items-center gap-2.5 border-b border-sidebar-border">
          <Image
            src="/Logo.png"
            alt="Excell Enterprises"
            width={28}
            height={28}
            className="size-7 rounded-md object-contain"
          />
          <div className="min-w-0">
            <SheetTitle className="truncate">Excell Enterprises</SheetTitle>
            <p className="truncate text-[11px] text-muted-foreground">
              Construction Operating Platform
            </p>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavList visibleHrefs={visibleHrefs} onNavigate={() => setOpen(false)} />
        </div>

        <div className="shrink-0 border-t border-sidebar-border p-3">
          <UserMenu user={user} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
