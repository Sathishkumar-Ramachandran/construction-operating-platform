import { ListChecks } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { UserRole } from "@/lib/authorization/roles";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function TasksPage() {
  const user = await requireRole([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TEAM_MEMBER,
  ]);
  const isTeamMemberOnly = user.role === UserRole.TEAM_MEMBER;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isTeamMemberOnly ? "My Tasks" : "Tasks"}
        description="Task management is not built yet."
      />
      <EmptyState
        icon={ListChecks}
        title="Task management is coming soon"
        description={
          isTeamMemberOnly
            ? "Tasks assigned to you will appear here."
            : "Project tasks and assignments will appear here."
        }
      />
    </div>
  );
}
