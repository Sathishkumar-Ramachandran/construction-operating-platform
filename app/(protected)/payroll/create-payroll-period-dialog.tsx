"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPayrollPeriodAction } from "@/actions/payroll-actions";

export function CreatePayrollPeriodDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [periodYear, setPeriodYear] = useState(String(now.getFullYear()));
  const [periodMonth, setPeriodMonth] = useState(String(now.getMonth() + 1));
  const [cutoffDate, setCutoffDate] = useState(now.toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const result = await createPayrollPeriodAction({
      periodYear: Number(periodYear),
      periodMonth: Number(periodMonth),
      cutoffDate,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Payroll period created.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" aria-hidden /> New payroll period
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New payroll period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={periodMonth}
                  onChange={(e) => setPeriodMonth(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input type="number" value={periodYear} onChange={(e) => setPeriodYear(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cutoff date</Label>
              <Input type="date" value={cutoffDate} onChange={(e) => setCutoffDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
