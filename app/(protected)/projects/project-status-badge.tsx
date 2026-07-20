import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/projects/constants";

/** Project lifecycle status — DRAFT/ACTIVE/CLOSED aren't approval semantics
 * (unlike ApprovalStatusBadge's PENDING/APPROVED/REJECTED), so this gets its
 * own small badge: neutral for DRAFT, blue/primary for ACTIVE (the "live"
 * state), muted for CLOSED (terminal, matches the no-hard-delete convention). */
const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  DRAFT: "border-border text-muted-foreground",
  ACTIVE: "border-primary/30 bg-primary/10 text-primary dark:border-primary/40",
  CLOSED: "border-border bg-muted text-muted-foreground",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", PROJECT_STATUS_STYLES[status])}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
