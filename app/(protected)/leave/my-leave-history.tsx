"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LeaveStatusBadge } from "@/components/shared/leave-status-badge";
import { LeaveRequestStatus } from "@/lib/hr/constants";
import { cancelLeaveRequestAction } from "@/actions/leave-actions";

export type MyLeaveHistoryRequest = {
  id: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  reason: string | null;
  status: LeaveRequestStatus;
  leaveType: { id: string; name: string; isPaid: boolean };
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function MyLeaveHistory({ requests }: { requests: MyLeaveHistoryRequest[] }) {
  const router = useRouter();
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  async function handleCancel(id: string) {
    setCancellingId(id);
    const result = await cancelLeaveRequestAction({ id });
    setCancellingId(null);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Leave request cancelled.");
    router.refresh();
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        title="No leave requests yet"
        description="Requests you submit will appear here."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {requests.map((request) => (
        <li
          key={request.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-sm"
        >
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">{request.leaveType.name}</span>
              <LeaveStatusBadge status={request.status} />
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(request.startDate)} – {formatDate(request.endDate)} · {request.dayCount}{" "}
              day{request.dayCount === 1 ? "" : "s"}
            </p>
            {request.reason ? (
              <p className="text-xs text-muted-foreground">{request.reason}</p>
            ) : null}
          </div>
          {request.status === LeaveRequestStatus.PENDING ? (
            <Button
              size="sm"
              variant="outline"
              disabled={cancellingId === request.id}
              onClick={() => handleCancel(request.id)}
            >
              {cancellingId === request.id ? "Cancelling…" : "Cancel"}
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
