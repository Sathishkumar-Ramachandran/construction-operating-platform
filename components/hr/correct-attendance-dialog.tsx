"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATTENDANCE_STATUS_LABELS, AUTO_DERIVED_ATTENDANCE_STATUSES } from "@/lib/hr/constants";
import { correctAttendanceAction } from "@/actions/attendance-actions";

const CORRECTABLE_STATUSES = [
  ...AUTO_DERIVED_ATTENDANCE_STATUSES.filter((s) => s !== "WEEKEND" && s !== "NOT_MARKED"),
  "HALF_DAY",
  "ON_LEAVE",
] as const;

export function CorrectAttendanceDialog({
  employeeId,
  employeeName,
  date,
  onOpenChange,
  onCorrected,
}: {
  employeeId: string;
  employeeName: string;
  date: string;
  onOpenChange: (open: boolean) => void;
  onCorrected?: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string>("PRESENT");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!notes.trim()) {
      toast.error("A reason is required.");
      return;
    }
    setSubmitting(true);
    const result = await correctAttendanceAction({
      employeeId,
      date,
      status,
      checkInTime,
      checkOutTime,
      notes,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Attendance updated.");
    onOpenChange(false);
    onCorrected?.();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct attendance</DialogTitle>
          <DialogDescription>
            {employeeName} · {date}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => v && setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CORRECTABLE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ATTENDANCE_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Check-in time</Label>
              <Input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Check-out time</Label>
              <Input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why is this correction being made?"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
