import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DashboardCard({
  icon: Icon,
  label,
  value,
  hint,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-border bg-card p-4",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="flex size-8 items-center justify-center rounded-lg bg-accent">
          <Icon className="size-4 text-accent-foreground" aria-hidden />
        </div>
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
