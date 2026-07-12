import { ClipboardCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { UserRole } from "@/lib/authorization/roles";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function ApprovalsPage() {
  await requireRole([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Approval workflows are not built yet."
      />
      <EmptyState
        icon={ClipboardCheck}
        title="Approval workflows are coming soon"
        description="Pending approvals for your projects and team will appear here."
      />
    </div>
  );
}
