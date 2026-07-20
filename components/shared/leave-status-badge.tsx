import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LEAVE_REQUEST_STATUS_LABELS, LeaveRequestStatus } from "@/lib/hr/constants";

const LEAVE_STATUS_STYLES: Record<LeaveRequestStatus, string> = {
  PENDING:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
  APPROVED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
  REJECTED:
    "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40",
  CANCELLED: "border-border text-muted-foreground",
};

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", LEAVE_STATUS_STYLES[status])}>
      {LEAVE_REQUEST_STATUS_LABELS[status]}
    </Badge>
  );
}
