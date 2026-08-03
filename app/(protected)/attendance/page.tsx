import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import { hasPermission } from "@/lib/services/authorization-service";
import { getMyTodayAttendance } from "@/lib/services/attendance-service";
import { PageHeader } from "@/components/shared/page-header";
import { CheckInOutCard } from "@/app/(protected)/attendance/check-in-out-card";
import { AttendanceBoard } from "@/app/(protected)/attendance/attendance-board";

export default async function AttendancePage() {
  return withTenantPermission(PERMISSIONS.HR_ATTENDANCE_VIEW.code, async (user) => {
    const isTeamMemberOnly = user.role === UserRole.TEAM_MEMBER;

    const [today, canManage] = await Promise.all([
      getMyTodayAttendance(user),
      hasPermission(user, PERMISSIONS.HR_ATTENDANCE_MANAGE.code),
    ]);

    return (
      <div className="space-y-6">
        <PageHeader
          title={isTeamMemberOnly ? "My Attendance" : "Attendance"}
          description={
            isTeamMemberOnly
              ? "Check in and out, and see your attendance history."
              : "Check in and out, and see today's workforce attendance."
          }
        />

        {today ? (
          <CheckInOutCard
            initial={{
              status: today.status,
              checkInAt: today.checkInAt ? today.checkInAt.toISOString() : null,
              checkOutAt: today.checkOutAt ? today.checkOutAt.toISOString() : null,
              holidayName: today.holidayName,
            }}
          />
        ) : null}

        {!isTeamMemberOnly ? <AttendanceBoard canManage={canManage} /> : null}
      </div>
    );
  });
}
