"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttendanceStatusBadge } from "@/components/shared/attendance-status-badge";
import { AttendanceStatus } from "@/lib/hr/constants";
import { checkInAction, checkOutAction } from "@/actions/attendance-actions";

export type TodayAttendanceView = {
  status: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
  holidayName: string | null;
};

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function CheckInOutCard({ initial: state }: { initial: TodayAttendanceView }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isNonWorkingDay = state.status === AttendanceStatus.WEEKEND || state.status === AttendanceStatus.HOLIDAY;
  const hasCheckedIn = !!state.checkInAt;
  const hasCheckedOut = !!state.checkOutAt;

  function handleCheckIn() {
    startTransition(async () => {
      const result = await checkInAction();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Checked in.");
      router.refresh();
    });
  }

  function handleCheckOut() {
    startTransition(async () => {
      const result = await checkOutAction();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Checked out.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Clock className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Today&apos;s attendance</p>
            <p className="text-xs text-muted-foreground">
              In {formatTime(state.checkInAt)} · Out {formatTime(state.checkOutAt)}
            </p>
          </div>
        </div>
        <AttendanceStatusBadge status={state.status} />
      </div>

      <div className="mt-4">
        {isNonWorkingDay ? (
          <p className="text-sm text-muted-foreground">
            {state.status === AttendanceStatus.HOLIDAY
              ? `Holiday${state.holidayName ? `: ${state.holidayName}` : ""}`
              : "Non-working day."}
          </p>
        ) : !hasCheckedIn ? (
          <Button onClick={handleCheckIn} disabled={isPending} className="gap-1.5">
            <LogIn className="size-4" aria-hidden /> Check In
          </Button>
        ) : !hasCheckedOut ? (
          <Button onClick={handleCheckOut} disabled={isPending} variant="outline" className="gap-1.5">
            <LogOut className="size-4" aria-hidden /> Check Out
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">You&apos;re done for today.</p>
        )}
      </div>
    </div>
  );
}
