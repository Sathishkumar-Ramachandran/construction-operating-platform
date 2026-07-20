"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarOff } from "lucide-react";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { LeaveStatusBadge } from "@/components/shared/leave-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { employeeDisplayName } from "@/lib/hr/employee-display";
import { LEAVE_REQUEST_STATUS_LABELS, LeaveRequestStatus } from "@/lib/hr/constants";

type TeamLeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  status: LeaveRequestStatus;
  leaveType: { id: string; name: string; isPaid: boolean };
  employee: { id: string; firstName: string; lastName: string | null; preferredName: string | null };
};

type LeaveRequestsResponse = {
  requests: TeamLeaveRequest[];
  total: number;
  page: number;
  pageSize: number;
};

const STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  ...Object.values(LeaveRequestStatus).map((status) => ({
    value: status,
    label: LEAVE_REQUEST_STATUS_LABELS[status],
  })),
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function TeamLeaveBoard() {
  const [status, setStatus] = useState<string>("ALL");

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (status !== "ALL") params.set("status", status);
    params.set("pageSize", "50");
    return params.toString();
  }, [status]);

  const { data, isLoading, isError, refetch } = useQuery<LeaveRequestsResponse>({
    queryKey: ["leave-requests", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/leave/requests?${queryParams}`);
      if (!res.ok) throw new Error("Failed to load leave requests.");
      return res.json();
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold text-foreground">Team leave</h3>
        <Select value={status} onValueChange={(v) => v && setStatus(v)} items={STATUS_FILTER_OPTIONS}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.requests.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No leave requests"
          description="Leave requests matching this filter will appear here."
        />
      ) : (
        <ul className="space-y-2">
          {data.requests.map((request) => (
            <li
              key={request.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {employeeDisplayName(request.employee)}
                  </span>
                  <span className="text-muted-foreground">{request.leaveType.name}</span>
                  <LeaveStatusBadge status={request.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDate(request.startDate)} – {formatDate(request.endDate)} · {request.dayCount}{" "}
                  day{request.dayCount === 1 ? "" : "s"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
