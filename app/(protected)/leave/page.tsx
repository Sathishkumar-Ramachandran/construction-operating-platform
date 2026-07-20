import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import { hasPermission } from "@/lib/services/authorization-service";
import { getActorEmployeeId } from "@/lib/services/employee-service";
import {
  listLeaveBalancesForEmployee,
  listLeaveRequestsForActor,
} from "@/lib/services/leave-service";
import { PageHeader } from "@/components/shared/page-header";
import { LeaveSummaryCards, type LeaveBalanceSummary } from "@/app/(protected)/leave/leave-summary-cards";
import { RequestLeaveDialog } from "@/app/(protected)/leave/request-leave-dialog";
import { MyLeaveHistory, type MyLeaveHistoryRequest } from "@/app/(protected)/leave/my-leave-history";
import { TeamLeaveBoard } from "@/app/(protected)/leave/team-leave-board";

export default async function LeavePage() {
  const user = await requirePermission(PERMISSIONS.HR_LEAVE_VIEW.code);
  const isTeamMemberOnly = user.role === UserRole.TEAM_MEMBER;

  const [employeeId, canManage] = await Promise.all([
    getActorEmployeeId(user.id),
    hasPermission(user, PERMISSIONS.HR_LEAVE_MANAGE.code),
  ]);

  const currentYear = new Date().getUTCFullYear();

  const [balanceRows, historyResult] = await Promise.all([
    employeeId ? listLeaveBalancesForEmployee(employeeId, currentYear) : Promise.resolve(null),
    employeeId
      ? listLeaveRequestsForActor(user, { employeeId, page: 1, pageSize: 20 })
      : Promise.resolve(null),
  ]);

  const balances: LeaveBalanceSummary[] | null =
    balanceRows?.map((row) => ({
      entitled: row.entitled,
      carriedForward: row.carriedForward,
      used: row.used,
      remaining: row.remaining,
      leaveType: {
        id: row.leaveType.id,
        code: row.leaveType.code,
        name: row.leaveType.name,
        defaultEntitlementDays: Number(row.leaveType.defaultEntitlementDays),
        isPaid: row.leaveType.isPaid,
      },
    })) ?? null;

  const historyRequests: MyLeaveHistoryRequest[] = (historyResult?.requests ?? []).map((request) => ({
    id: request.id,
    startDate: request.startDate.toISOString(),
    endDate: request.endDate.toISOString(),
    dayCount: Number(request.dayCount),
    reason: request.reason,
    status: request.status as MyLeaveHistoryRequest["status"],
    leaveType: request.leaveType,
  }));

  const showTeamBoard = canManage || user.role === UserRole.MANAGER;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isTeamMemberOnly ? "My Leave" : "Leave"}
        description={
          isTeamMemberOnly
            ? "Check your leave balance, request leave, and track your requests."
            : "Track leave balances, requests, and the team leave board."
        }
        actions={employeeId ? <RequestLeaveDialog /> : null}
      />

      {balances ? <LeaveSummaryCards balances={balances} /> : null}

      {employeeId ? (
        <section className="space-y-3">
          <h3 className="font-heading text-sm font-semibold text-foreground">Your requests</h3>
          <MyLeaveHistory requests={historyRequests} />
        </section>
      ) : null}

      {showTeamBoard ? <TeamLeaveBoard /> : null}
    </div>
  );
}
