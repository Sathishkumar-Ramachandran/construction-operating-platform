"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAVIGATION } from "@/lib/authorization/navigation";

export function NavList({
  visibleHrefs,
  onNavigate,
}: {
  visibleHrefs: string[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const visible = new Set(visibleHrefs);

  return (
    <nav className="flex flex-col gap-5">
      {NAVIGATION.map((group, index) => {
        const items = group.items.filter((item) => visible.has(item.href));
        if (items.length === 0) return null;

        return (
          <div key={group.title ?? `group-${index}`} className="flex flex-col gap-1">
            {group.title ? (
              <p className="px-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group.title}
              </p>
            ) : null}
            {items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border-l-2 px-2.5 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground"
                      : "border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon
                    className={cn("size-4 shrink-0", isActive && "text-sidebar-primary")}
                    aria-hidden
                  />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
