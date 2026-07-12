import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EMPLOYMENT_STATUS_LABELS, EmploymentStatus } from "@/lib/hr/constants";

const ACTIVE_LIKE: EmploymentStatus[] = [
  EmploymentStatus.ACTIVE,
  EmploymentStatus.PRE_ONBOARDING,
];
const CAUTION_LIKE: EmploymentStatus[] = [
  EmploymentStatus.ON_LEAVE,
  EmploymentStatus.SUSPENDED,
  EmploymentStatus.NOTICE_PERIOD,
];

export function EmploymentStatusBadge({ status }: { status: string }) {
  const value = status as EmploymentStatus;
  const isActiveLike = ACTIVE_LIKE.includes(value);
  const isCautionLike = CAUTION_LIKE.includes(value);

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        isActiveLike &&
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
        isCautionLike &&
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
        !isActiveLike && !isCautionLike && "border-border text-muted-foreground"
      )}
    >
      {EMPLOYMENT_STATUS_LABELS[value] ?? status}
    </Badge>
  );
}
