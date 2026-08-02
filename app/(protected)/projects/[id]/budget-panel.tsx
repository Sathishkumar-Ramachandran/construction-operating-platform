"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { setBudgetLineAction, deleteBudgetLineAction } from "@/actions/budget-line-actions";
import { BudgetLineCategory, BUDGET_LINE_CATEGORY_LABELS, type BudgetLineCategory as BudgetLineCategoryType } from "@/lib/projects/constants";
import type { BudgetLineView } from "@/app/(protected)/projects/[id]/types";

function money(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BudgetPanel({
  projectId,
  budgetLines,
  canManageBudget,
}: {
  projectId: string;
  budgetLines: BudgetLineView[];
  canManageBudget: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const totals = budgetLines.reduce(
    (acc, line) => ({
      budgeted: acc.budgeted + line.budgetedAmount,
      committed: acc.committed + line.committedAmount,
      actual: acc.actual + line.actualAmount,
    }),
    { budgeted: 0, committed: 0, actual: 0 }
  );

  async function handleDelete(id: string) {
    const result = await deleteBudgetLineAction(id, projectId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Budget line removed.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Budget</h4>
        {canManageBudget ? (
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" aria-hidden /> Add line
          </Button>
        ) : null}
      </div>

      {budgetLines.length === 0 ? (
        <EmptyState icon={Wallet} title="No budget lines yet" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:max-w-lg">
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Budgeted</p>
              <p className="text-sm font-semibold text-foreground">{money(totals.budgeted)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Committed</p>
              <p className="text-sm font-semibold text-foreground">{money(totals.committed)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">Actual</p>
              <p className="text-sm font-semibold text-foreground">{money(totals.actual)}</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Budgeted</TableHead>
                <TableHead className="text-right">Committed</TableHead>
                <TableHead className="text-right">Actual</TableHead>
                {canManageBudget ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgetLines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">
                    {BUDGET_LINE_CATEGORY_LABELS[line.category as BudgetLineCategoryType] ?? line.category}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{line.description ?? "—"}</TableCell>
                  <TableCell className="text-right">{money(line.budgetedAmount)}</TableCell>
                  <TableCell className="text-right">{money(line.committedAmount)}</TableCell>
                  <TableCell className="text-right">{money(line.actualAmount)}</TableCell>
                  {canManageBudget ? (
                    <TableCell>
                      <Button size="icon-sm" variant="ghost" onClick={() => handleDelete(line.id)}>
                        <Trash2 className="size-3.5" aria-hidden />
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {createOpen ? <CreateBudgetLineDialog projectId={projectId} onOpenChange={setCreateOpen} /> : null}
    </div>
  );
}

function CreateBudgetLineDialog({
  projectId,
  onOpenChange,
}: {
  projectId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<string>(BudgetLineCategory.LABOUR);
  const [description, setDescription] = useState("");
  const [budgetedAmount, setBudgetedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const categories = Object.values(BudgetLineCategory);

  async function handleSubmit() {
    if (!budgetedAmount) {
      toast.error("Enter a budgeted amount.");
      return;
    }
    setSubmitting(true);
    const result = await setBudgetLineAction({
      projectId,
      category,
      description,
      budgetedAmount: Number(budgetedAmount),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Budget line added.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add budget line</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value ?? BudgetLineCategory.LABOUR)}
              items={categories.map((c) => ({ value: c, label: BUDGET_LINE_CATEGORY_LABELS[c] }))}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{BUDGET_LINE_CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Budgeted amount</Label>
            <Input type="number" min={0} step="0.01" value={budgetedAmount} onChange={(e) => setBudgetedAmount(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
