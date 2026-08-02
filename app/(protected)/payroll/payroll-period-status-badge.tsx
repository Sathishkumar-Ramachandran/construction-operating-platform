import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PAYROLL_PERIOD_STATUS_LABELS, type PayrollPeriodStatus } from "@/lib/payroll/constants";

const PAYROLL_PERIOD_STATUS_STYLES: Record<PayrollPeriodStatus, string> = {
  OPEN: "border-border text-muted-foreground",
  PROCESSING: "border-primary/30 bg-primary/10 text-primary dark:border-primary/40",
  PENDING_APPROVAL: "border-gold/40 bg-gold/10 text-gold-foreground",
  APPROVED: "border-primary/30 bg-primary/10 text-primary dark:border-primary/40",
  PAID: "border-border bg-muted text-muted-foreground",
  CLOSED: "border-border bg-muted text-muted-foreground",
};

export function PayrollPeriodStatusBadge({ status }: { status: PayrollPeriodStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", PAYROLL_PERIOD_STATUS_STYLES[status])}>
      {PAYROLL_PERIOD_STATUS_LABELS[status]}
    </Badge>
  );
}
