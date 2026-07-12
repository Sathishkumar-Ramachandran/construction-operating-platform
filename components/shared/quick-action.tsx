import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

export function QuickAction({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/50"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
        <Icon className="size-4 text-accent-foreground" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {description}
        </p>
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
