import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/crm/constants";

const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "border-border text-muted-foreground",
  QUALIFIED: "border-primary/30 bg-primary/10 text-primary dark:border-primary/40",
  IN_PROGRESS: "border-primary/30 bg-primary/10 text-primary dark:border-primary/40",
  NEGOTIATION: "border-gold/40 bg-gold/10 text-gold-foreground",
  WON: "border-primary/30 bg-primary/10 text-primary dark:border-primary/40",
  LOST: "border-border bg-muted text-muted-foreground",
  CONVERTED: "border-border bg-muted text-muted-foreground",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", LEAD_STATUS_STYLES[status])}>
      {LEAD_STATUS_LABELS[status]}
    </Badge>
  );
}
