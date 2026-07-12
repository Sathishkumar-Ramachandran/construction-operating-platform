"use client";

import Link from "next/link";
import { LogOut, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "@/components/shared/role-badge";
import { logout } from "@/actions/auth-actions";
import { ROLE_LABELS } from "@/lib/authorization/roles";
import type { AuthenticatedUser } from "@/types/auth";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserMenu({
  user,
  compact = false,
}: {
  user: AuthenticatedUser;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          compact
            ? "flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            : "flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-sidebar-accent/60 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        }
      >
        <Avatar>
          <AvatarFallback>{initials(user.name)}</AvatarFallback>
        </Avatar>
        {compact ? (
          <span className="sr-only">Open account menu</span>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={compact ? "end" : "start"}
        side={compact ? "bottom" : "top"}
        className="w-56"
      >
        <DropdownMenuLabel className="flex flex-col gap-1 px-1.5 py-1.5">
          <span className="text-sm font-medium text-foreground">
            {user.name}
          </span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
          <RoleBadge role={user.role} />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <UserIcon /> My Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={logout}>
          <DropdownMenuItem
            variant="destructive"
            render={<button type="submit" className="w-full" />}
          >
            <LogOut /> Logout
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
