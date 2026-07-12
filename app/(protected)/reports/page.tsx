import { BarChart3 } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function ReportsPage() {
  await requirePermission(PERMISSIONS.REPORTS_VIEW.code);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Reporting and dashboards are not built yet."
      />
      <EmptyState
        icon={BarChart3}
        title="Reporting is coming soon"
        description="Operational, HR, and project reports will appear here."
      />
    </div>
  );
}
