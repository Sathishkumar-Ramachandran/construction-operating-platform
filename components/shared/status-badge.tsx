import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        isActive
          ? "border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-400"
          : "border-border text-muted-foreground"
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          isActive ? "bg-emerald-500" : "bg-muted-foreground"
        )}
      />
      {isActive ? "Active" : "Inactive"}
    </Badge>
  );
}
