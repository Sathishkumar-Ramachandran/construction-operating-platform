"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createLeaveRequestAction } from "@/actions/leave-actions";

type LeaveTypeOption = {
  id: string;
  name: string;
  isPaid: boolean;
  isActive: boolean;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function RequestLeaveDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState<string>("");
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [startHalfDay, setStartHalfDay] = useState(false);
  const [endHalfDay, setEndHalfDay] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: leaveTypes = [] } = useQuery<LeaveTypeOption[]>({
    queryKey: ["hr-settings", "leave-types"],
    queryFn: async () => {
      const res = await fetch("/api/hr-settings/leave-types");
      if (!res.ok) throw new Error("Failed to load leave types.");
      const { items } = await res.json();
      return items;
    },
    staleTime: 60_000,
    enabled: open,
  });

  const activeLeaveTypes = leaveTypes.filter((lt) => lt.isActive !== false);

  function resetForm() {
    setLeaveTypeId("");
    setStartDate(todayIso());
    setEndDate(todayIso());
    setStartHalfDay(false);
    setEndHalfDay(false);
    setReason("");
  }

  async function handleSubmit() {
    if (!leaveTypeId) {
      toast.error("Select a leave type.");
      return;
    }
    setSubmitting(true);
    const result = await createLeaveRequestAction({
      leaveTypeId,
      startDate,
      endDate,
      startHalfDay,
      endHalfDay,
      reason,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Leave request submitted.");
    setOpen(false);
    resetForm();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Request leave</Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request leave</DialogTitle>
            <DialogDescription>
              Submit a leave request for approval by your reporting manager.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Leave type</Label>
              <Select
                value={leaveTypeId}
                onValueChange={(v) => v && setLeaveTypeId(v)}
                items={activeLeaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {activeLeaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      {lt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End date</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={startHalfDay} onCheckedChange={(v) => setStartHalfDay(v === true)} />
                Start half day
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={endHalfDay} onCheckedChange={(v) => setEndHalfDay(v === true)} />
                End half day
              </label>
            </div>

            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Optional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
