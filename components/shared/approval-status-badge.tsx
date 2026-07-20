import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const APPROVAL_STATUS_STYLES: Record<string, string> = {
  PENDING:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
  APPROVED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400",
  REJECTED:
    "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40",
  CANCELLED: "border-border text-muted-foreground",
  SKIPPED: "border-border text-muted-foreground",
};

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  SKIPPED: "Skipped",
};

export function ApprovalStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", APPROVAL_STATUS_STYLES[status] ?? "border-border text-muted-foreground")}
    >
      {APPROVAL_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
