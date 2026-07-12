import { CalendarOff } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function LeavePage() {
  const user = await requirePermission(PERMISSIONS.HR_LEAVE_VIEW.code);
  const isTeamMemberOnly = user.role === UserRole.TEAM_MEMBER;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isTeamMemberOnly ? "My Leave" : "Leave"}
        description="Leave management is not built yet."
      />
      <EmptyState
        icon={CalendarOff}
        title="Leave management is coming soon"
        description={
          isTeamMemberOnly
            ? "Your leave balance and requests will appear here."
            : "Leave requests, approvals, and balances will appear here."
        }
      />
    </div>
  );
}
