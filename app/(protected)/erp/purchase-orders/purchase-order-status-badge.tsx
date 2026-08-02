import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PURCHASE_ORDER_STATUS_LABELS, type PurchaseOrderStatus } from "@/lib/erp/constants";

const PURCHASE_ORDER_STATUS_STYLES: Record<PurchaseOrderStatus, string> = {
  DRAFT: "border-border text-muted-foreground",
  SUBMITTED: "border-gold/40 bg-gold/10 text-gold-foreground",
  APPROVED: "border-primary/30 bg-primary/10 text-primary dark:border-primary/40",
  PARTIALLY_RECEIVED: "border-gold/40 bg-gold/10 text-gold-foreground",
  RECEIVED: "border-border bg-muted text-muted-foreground",
  CANCELLED: "border-border bg-muted text-muted-foreground",
};

export function PurchaseOrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", PURCHASE_ORDER_STATUS_STYLES[status])}>
      {PURCHASE_ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
