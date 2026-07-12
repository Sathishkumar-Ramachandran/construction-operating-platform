import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WORKFORCE_AVAILABILITY_LABELS, WorkforceAvailability } from "@/lib/hr/constants";

const AVAILABILITY_STYLES: Record<WorkforceAvailability, string> = {
  IN_PROJECT:
    "border-primary/30 bg-primary/10 text-primary dark:border-primary/40",
  FREE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
  PARTIALLY_ALLOCATED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
  TEMPORARILY_UNAVAILABLE:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-400",
  ON_LEAVE:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400",
  INACTIVE: "border-border text-muted-foreground",
};

export function WorkforceAvailabilityBadge({
  status,
}: {
  status: WorkforceAvailability;
}) {
  return (
    <Badge variant="outline" className={cn("font-medium", AVAILABILITY_STYLES[status])}>
      {WORKFORCE_AVAILABILITY_LABELS[status]}
    </Badge>
  );
}
