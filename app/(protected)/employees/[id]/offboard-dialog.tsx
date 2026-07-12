"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { offboardEmployeeAction } from "@/actions/employee-actions";

const TRIGGERS = [
  { value: "RESIGNATION", label: "Resignation" },
  { value: "TERMINATION", label: "Termination" },
  { value: "RETIREMENT", label: "Retirement" },
  { value: "CONTRACT_COMPLETION", label: "Contract completion" },
  { value: "ABSCONDING", label: "Absconding" },
  { value: "OTHER", label: "Other" },
];

export function OffboardDialog({
  open,
  onOpenChange,
  employeeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
}) {
  const router = useRouter();
  const [triggerCategory, setTriggerCategory] = useState("RESIGNATION");
  const [lastWorkingDate, setLastWorkingDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [rehireEligible, setRehireEligible] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (reason.trim().length < 3) {
      toast.error("A reason is required.");
      return;
    }
    setSubmitting(true);
    const result = await offboardEmployeeAction({
      employeeId,
      triggerCategory,
      lastWorkingDate,
      reason,
      rehireEligible,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Employee offboarded.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Offboard employee</DialogTitle>
          <DialogDescription>
            This sets the employee to Offboarded, deactivates their login and signs them
            out everywhere, and closes their active project assignments. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Trigger</Label>
            <Select value={triggerCategory} onValueChange={(v) => v && setTriggerCategory(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIGGERS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Last working date</Label>
            <Input type="date" value={lastWorkingDate} onChange={(e) => setLastWorkingDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={rehireEligible} onCheckedChange={(v) => setRehireEligible(v === true)} />
            Eligible for rehire
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Offboarding…" : "Offboard employee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
