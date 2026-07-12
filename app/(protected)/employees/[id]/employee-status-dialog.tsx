"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EMPLOYMENT_STATUS_TRANSITIONS, EMPLOYMENT_STATUS_LABELS, type EmploymentStatus } from "@/lib/hr/constants";
import { changeEmploymentStatusAction } from "@/actions/employee-actions";

export function EmployeeStatusDialog({
  open,
  onOpenChange,
  employeeId,
  currentStatus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  currentStatus: string;
}) {
  const allowedNext = EMPLOYMENT_STATUS_TRANSITIONS[currentStatus as EmploymentStatus] ?? [];
  const [newStatus, setNewStatus] = useState<string>("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!newStatus) {
      toast.error("Select a new status.");
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("A reason is required.");
      return;
    }
    setSubmitting(true);
    const result = await changeEmploymentStatusAction({
      employeeId,
      newStatus,
      effectiveDate,
      reason,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Employment status updated.");
    setReason("");
    setNewStatus("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change employment status</DialogTitle>
          <DialogDescription>
            Only transitions valid from the current status ({EMPLOYMENT_STATUS_LABELS[currentStatus as EmploymentStatus] ?? currentStatus}) are allowed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>New status</Label>
            <Select value={newStatus} onValueChange={(v) => v && setNewStatus(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {allowedNext.map((status) => (
                  <SelectItem key={status} value={status}>
                    {EMPLOYMENT_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {allowedNext.length === 0 ? (
              <p className="text-xs text-muted-foreground">No further transitions are available from this status.</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Effective date</Label>
            <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting || allowedNext.length === 0}>
            {submitting ? "Saving…" : "Save status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
