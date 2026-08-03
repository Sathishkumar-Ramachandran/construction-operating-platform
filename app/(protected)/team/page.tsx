import { Users2 } from "lucide-react";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function TeamPage() {
  return withTenantPermission(PERMISSIONS.TEAM_VIEW.code, async () => {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Team"
          description="Team management is not built yet."
        />
        <EmptyState
          icon={Users2}
          title="Team management is coming soon"
          description="This module will show your assigned team members and their project workload."
        />
      </div>
    );
  });
}
