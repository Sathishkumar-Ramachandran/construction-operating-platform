import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ATTENDANCE_STATUS_LABELS, AttendanceStatus } from "@/lib/hr/constants";

const ATTENDANCE_STYLES: Record<AttendanceStatus, string> = {
  PRESENT:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
  LATE:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
  HALF_DAY:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-400",
  ABSENT:
    "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40",
  ON_LEAVE:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-400",
  HOLIDAY: "border-gold/40 bg-gold/10 text-gold-foreground dark:border-gold/30",
  WEEKEND: "border-border text-muted-foreground",
  NOT_MARKED: "border-border text-muted-foreground",
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", ATTENDANCE_STYLES[status])}>
      {ATTENDANCE_STATUS_LABELS[status]}
    </Badge>
  );
}
