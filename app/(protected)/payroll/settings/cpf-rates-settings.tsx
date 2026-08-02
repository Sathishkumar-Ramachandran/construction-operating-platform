"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setCpfContributionRateAction } from "@/actions/payroll-actions";

export type CpfRateRow = {
  id: string;
  ageBandLabel: string;
  minAge: number;
  maxAge: number | null;
  wageCeiling: string;
  employeeRate: string;
  employerRate: string;
  effectiveFrom: string;
};

export function CpfRatesSettings({ rates }: { rates: CpfRateRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<CpfRateRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm text-muted-foreground">
        These rates seed a starting schedule and <strong>must be verified against the current
        CPF Board rates</strong> before running real payroll — MOM/CPF rates change periodically,
        especially for older age bands.
      </div>

      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="size-3.5" aria-hidden /> Add rate
        </Button>
        {createOpen ? <RateDialog onOpenChange={setCreateOpen} /> : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Age band</TableHead>
            <TableHead>Wage ceiling</TableHead>
            <TableHead>Employee %</TableHead>
            <TableHead>Employer %</TableHead>
            <TableHead>Effective from</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((rate) => (
            <TableRow key={rate.id}>
              <TableCell>{rate.ageBandLabel}</TableCell>
              <TableCell>${Number(rate.wageCeiling).toFixed(2)}</TableCell>
              <TableCell>{(Number(rate.employeeRate) * 100).toFixed(2)}%</TableCell>
              <TableCell>{(Number(rate.employerRate) * 100).toFixed(2)}%</TableCell>
              <TableCell>{new Date(rate.effectiveFrom).toLocaleDateString("en-SG")}</TableCell>
              <TableCell>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditRow(rate)}>
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </Button>
                {editRow?.id === rate.id ? (
                  <RateDialog initial={rate} onOpenChange={(open) => !open && setEditRow(null)} />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RateDialog({
  initial,
  onOpenChange,
}: {
  initial?: CpfRateRow;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [ageBandLabel, setAgeBandLabel] = useState(initial?.ageBandLabel ?? "");
  const [minAge, setMinAge] = useState(initial ? String(initial.minAge) : "0");
  const [maxAge, setMaxAge] = useState(initial?.maxAge != null ? String(initial.maxAge) : "");
  const [wageCeiling, setWageCeiling] = useState(initial?.wageCeiling ?? "7400");
  const [employeeRate, setEmployeeRate] = useState(
    initial ? String(Number(initial.employeeRate) * 100) : ""
  );
  const [employerRate, setEmployerRate] = useState(
    initial ? String(Number(initial.employerRate) * 100) : ""
  );
  const [effectiveFrom, setEffectiveFrom] = useState(
    initial ? new Date(initial.effectiveFrom).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const result = await setCpfContributionRateAction(initial?.id ?? null, {
      ageBandLabel,
      minAge: Number(minAge),
      maxAge: maxAge === "" ? "" : Number(maxAge),
      wageCeiling: Number(wageCeiling),
      employeeRate: Number(employeeRate) / 100,
      employerRate: Number(employerRate) / 100,
      effectiveFrom,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("CPF rate saved.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit CPF rate" : "New CPF rate"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Age band label</Label>
            <Input value={ageBandLabel} onChange={(e) => setAgeBandLabel(e.target.value)} placeholder="e.g. 55 and below" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Min age</Label>
              <Input type="number" value={minAge} onChange={(e) => setMinAge(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Max age (blank = no cap)</Label>
              <Input type="number" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Wage ceiling ($)</Label>
            <Input type="number" step="0.01" value={wageCeiling} onChange={(e) => setWageCeiling(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Employee rate (%)</Label>
              <Input type="number" step="0.01" value={employeeRate} onChange={(e) => setEmployeeRate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Employer rate (%)</Label>
              <Input type="number" step="0.01" value={employerRate} onChange={(e) => setEmployerRate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Effective from</Label>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
