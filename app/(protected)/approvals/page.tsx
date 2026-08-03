import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { hasPermission } from "@/lib/services/authorization-service";
import { PageHeader } from "@/components/shared/page-header";
import { ApprovalsInbox } from "@/app/(protected)/approvals/approvals-inbox";

export default async function ApprovalsPage() {
  return withTenantPermission(PERMISSIONS.APPROVALS_VIEW.code, async (actor) => {
    const canDecide = await hasPermission(actor, PERMISSIONS.APPROVALS_DECIDE.code);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Approvals"
          description="Requests waiting on your decision, and requests you've filed."
        />
        <ApprovalsInbox canDecide={canDecide} />
      </div>
    );
  });
}
