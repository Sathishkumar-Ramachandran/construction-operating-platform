"use client";

import { useState } from "react";
import { Pencil, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { AttendanceStatusBadge } from "@/components/shared/attendance-status-badge";
import { CorrectAttendanceDialog } from "@/components/hr/correct-attendance-dialog";
import type { AttendanceStatus } from "@/lib/hr/constants";

export type AttendanceHistoryDayView = {
  date: string;
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  notes: string | null;
};

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function AttendancePanel({
  employeeId,
  employeeName,
  history,
  canManage,
}: {
  employeeId: string;
  employeeName: string;
  history: AttendanceHistoryDayView[];
  canManage: boolean;
}) {
  const [correctingDate, setCorrectingDate] = useState<string | null>(null);

  if (history.length === 0) {
    return (
      <EmptyState
        icon={CalendarClock}
        title="No attendance history"
        description="Attendance records will appear here once check-ins begin."
      />
    );
  }

  return (
    <div className="space-y-2">
      {history.map((day) => (
        <div
          key={day.date}
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              In {formatTime(day.checkInAt)} · Out {formatTime(day.checkOutAt)}
              {day.notes ? ` · ${day.notes}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AttendanceStatusBadge status={day.status} />
            {canManage ? (
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => setCorrectingDate(day.date)}
              >
                <Pencil className="size-3.5" aria-hidden />
              </Button>
            ) : null}
          </div>
        </div>
      ))}

      {correctingDate ? (
        <CorrectAttendanceDialog
          employeeId={employeeId}
          employeeName={employeeName}
          date={correctingDate}
          onOpenChange={(open) => !open && setCorrectingDate(null)}
        />
      ) : null}
    </div>
  );
}
