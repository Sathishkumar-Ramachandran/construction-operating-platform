import { CalendarClock } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function AttendancePage() {
  const user = await requirePermission(PERMISSIONS.HR_ATTENDANCE_VIEW.code);
  const isTeamMemberOnly = user.role === UserRole.TEAM_MEMBER;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isTeamMemberOnly ? "My Attendance" : "Attendance"}
        description="Attendance tracking is not built yet."
      />
      <EmptyState
        icon={CalendarClock}
        title="Attendance tracking is coming soon"
        description={
          isTeamMemberOnly
            ? "Your clock-in/out history and attendance summary will appear here."
            : "Workforce attendance, clock-in/out records, and site check-ins will appear here."
        }
      />
    </div>
  );
}
