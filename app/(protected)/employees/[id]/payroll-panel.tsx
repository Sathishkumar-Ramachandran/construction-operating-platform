"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Wallet } from "lucide-react";
import { setSalaryStructureAction } from "@/actions/payroll-actions";
import { PAYROLL_PERIOD_STATUS_LABELS } from "@/lib/payroll/constants";
import type { getSalaryStructureForEmployee, listPayslipsForEmployee } from "@/lib/services/payroll-service";

type SalaryStructure = Awaited<ReturnType<typeof getSalaryStructureForEmployee>>;
type Payslips = Awaited<ReturnType<typeof listPayslipsForEmployee>>;

type ComponentRow = {
  type: "ALLOWANCE" | "DEDUCTION" | "BONUS";
  code: string;
  label: string;
  amount: string;
  isRecurring: boolean;
};

export function PayrollPanel({
  employeeId,
  salaryStructure,
  payslips,
  canManageStructures,
}: {
  employeeId: string;
  salaryStructure: SalaryStructure;
  payslips: Payslips;
  canManageStructures: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DashboardCard
          icon={Wallet}
          label="Basic monthly salary"
          value={
            salaryStructure
              ? `$${Number(salaryStructure.basicMonthlySalary).toLocaleString("en-SG", { minimumFractionDigits: 2 })}`
              : "Not set"
          }
        />
        <DashboardCard
          icon={Wallet}
          label="CPF applicable"
          value={salaryStructure ? (salaryStructure.cpfApplicable ? "Yes" : "No") : "—"}
        />
        <DashboardCard icon={Wallet} label="Payslips on file" value={payslips.length} />
      </div>

      {canManageStructures ? (
        <div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            {salaryStructure ? "Edit salary structure" : "Set salary structure"}
          </Button>
          {dialogOpen ? (
            <SalaryStructureDialog
              employeeId={employeeId}
              initial={salaryStructure}
              onOpenChange={setDialogOpen}
            />
          ) : null}
        </div>
      ) : null}

      {salaryStructure && salaryStructure.components.length > 0 ? (
        <div className="rounded-xl border border-border bg-card p-4">
          <h4 className="mb-2 text-sm font-semibold text-foreground">Allowances &amp; deductions</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Label</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salaryStructure.components.map((component) => (
                <TableRow key={component.id}>
                  <TableCell>{component.type}</TableCell>
                  <TableCell>{component.label}</TableCell>
                  <TableCell className="text-right">${Number(component.amount).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <div>
        <h4 className="mb-2 text-sm font-semibold text-foreground">Payslip history</h4>
        {payslips.length === 0 ? (
          <EmptyState icon={Wallet} title="No payslips yet" description="Payslips appear here once a payroll run including this employee is processed." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map((payslip) => (
                <TableRow key={payslip.id}>
                  <TableCell>
                    {payslip.payrollPeriod.periodMonth}/{payslip.payrollPeriod.periodYear}
                  </TableCell>
                  <TableCell>
                    {PAYROLL_PERIOD_STATUS_LABELS[
                      payslip.payrollPeriod.status as keyof typeof PAYROLL_PERIOD_STATUS_LABELS
                    ] ?? payslip.payrollPeriod.status}
                  </TableCell>
                  <TableCell className="text-right">${Number(payslip.grossPay).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${Number(payslip.netPay).toFixed(2)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/payroll/payslips/${payslip.id}`} />}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function SalaryStructureDialog({
  employeeId,
  initial,
  onOpenChange,
}: {
  employeeId: string;
  initial: SalaryStructure;
  onOpenChange: (open: boolean) => void;
}) {
  const [basicMonthlySalary, setBasicMonthlySalary] = useState(
    initial ? String(initial.basicMonthlySalary) : ""
  );
  const [effectiveFrom, setEffectiveFrom] = useState(
    initial ? new Date(initial.effectiveFrom).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [cpfApplicable, setCpfApplicable] = useState(initial?.cpfApplicable ?? true);
  const [components, setComponents] = useState<ComponentRow[]>(
    initial
      ? initial.components.map((c) => ({
          type: c.type as ComponentRow["type"],
          code: c.code,
          label: c.label,
          amount: String(c.amount),
          isRecurring: c.isRecurring,
        }))
      : []
  );
  const [submitting, setSubmitting] = useState(false);

  function addComponent() {
    setComponents((prev) => [
      ...prev,
      { type: "ALLOWANCE", code: "", label: "", amount: "0", isRecurring: true },
    ]);
  }

  function updateComponent(index: number, patch: Partial<ComponentRow>) {
    setComponents((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeComponent(index: number) {
    setComponents((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!basicMonthlySalary || !effectiveFrom) {
      toast.error("Basic monthly salary and effective date are required.");
      return;
    }
    setSubmitting(true);
    const result = await setSalaryStructureAction({
      employeeId,
      basicMonthlySalary: Number(basicMonthlySalary),
      effectiveFrom,
      cpfApplicable,
      components: components.map((c) => ({
        type: c.type,
        code: c.code || c.label.toUpperCase().replaceAll(" ", "_"),
        label: c.label,
        amount: Number(c.amount),
        isRecurring: c.isRecurring,
      })),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Salary structure saved.");
    onOpenChange(false);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Salary structure</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto py-2">
          <div className="space-y-1.5">
            <Label>Basic monthly salary</Label>
            <Input
              type="number"
              step="0.01"
              value={basicMonthlySalary}
              onChange={(e) => setBasicMonthlySalary(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Effective from</Label>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>CPF applicable</Label>
            <Switch checked={cpfApplicable} onCheckedChange={setCpfApplicable} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Allowances &amp; deductions</Label>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={addComponent}>
                <Plus className="size-3.5" aria-hidden /> Add
              </Button>
            </div>
            {components.map((component, index) => (
              <div key={index} className="grid grid-cols-[1fr_1.5fr_1fr_auto] items-end gap-2">
                <Select
                  value={component.type}
                  onValueChange={(value) => updateComponent(index, { type: value as ComponentRow["type"] })}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALLOWANCE">Allowance</SelectItem>
                    <SelectItem value="DEDUCTION">Deduction</SelectItem>
                    <SelectItem value="BONUS">Bonus</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Label"
                  value={component.label}
                  onChange={(e) => updateComponent(index, { label: e.target.value })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={component.amount}
                  onChange={(e) => updateComponent(index, { amount: e.target.value })}
                />
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => removeComponent(index)}>
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </div>
            ))}
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
