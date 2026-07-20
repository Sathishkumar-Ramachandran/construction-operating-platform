import { CalendarRange } from "lucide-react";
import { DashboardCard } from "@/components/shared/dashboard-card";

export type LeaveBalanceSummary = {
  leaveType: {
    id: string;
    code: string;
    name: string;
    defaultEntitlementDays: number;
    isPaid: boolean;
  };
  entitled: number;
  carriedForward: number;
  used: number;
  remaining: number;
};

export function LeaveSummaryCards({ balances }: { balances: LeaveBalanceSummary[] }) {
  if (balances.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {balances.map((balance) => (
        <DashboardCard
          key={balance.leaveType.id}
          icon={CalendarRange}
          label={balance.leaveType.name}
          value={`${balance.remaining} / ${balance.entitled + balance.carriedForward}`}
          hint="days remaining"
        />
      ))}
    </div>
  );
}
