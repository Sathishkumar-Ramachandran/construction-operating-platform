"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createQuotationAction, changeQuotationStatusAction } from "@/actions/quotation-actions";
import { QUOTATION_STATUS_LABELS, QUOTATION_STATUS_TRANSITIONS, type QuotationStatus } from "@/lib/crm/constants";
import { FileText } from "lucide-react";

type Quotation = {
  id: string;
  version: number;
  status: string;
  totalAmount: string;
  validUntil: string | null;
};

export function QuotationPanel({ leadId, quotations, canManage }: { leadId: string; quotations: Quotation[]; canManage: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Quotations</h4>
        {canManage ? (
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" aria-hidden /> New quotation
          </Button>
        ) : null}
      </div>
      {createOpen ? <CreateQuotationDialog leadId={leadId} onOpenChange={setCreateOpen} /> : null}

      {quotations.length === 0 ? (
        <EmptyState icon={FileText} title="No quotations yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Version</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Valid until</TableHead>
              {canManage ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotations.map((quotation) => (
              <TableRow key={quotation.id}>
                <TableCell>v{quotation.version}</TableCell>
                <TableCell><Badge variant="outline">{QUOTATION_STATUS_LABELS[quotation.status as QuotationStatus]}</Badge></TableCell>
                <TableCell className="text-right">${Number(quotation.totalAmount).toFixed(2)}</TableCell>
                <TableCell>{quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString("en-SG") : "—"}</TableCell>
                {canManage ? (
                  <TableCell>
                    <QuotationStatusChanger leadId={leadId} quotation={quotation} />
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function QuotationStatusChanger({ leadId, quotation }: { leadId: string; quotation: Quotation }) {
  const router = useRouter();
  const options = QUOTATION_STATUS_TRANSITIONS[quotation.status as QuotationStatus] ?? [];
  const [submitting, setSubmitting] = useState(false);

  if (options.length === 0) return null;

  async function handleChange(status: string) {
    setSubmitting(true);
    const result = await changeQuotationStatusAction(quotation.id, leadId, { status });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Quotation marked ${QUOTATION_STATUS_LABELS[status as QuotationStatus]}.`);
    router.refresh();
  }

  return (
    <Select value="" onValueChange={(value) => value && handleChange(value as string)} disabled={submitting}>
      <SelectTrigger size="sm" className="w-40"><SelectValue placeholder="Change status" /></SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>{QUOTATION_STATUS_LABELS[opt]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CreateQuotationDialog({ leadId, onOpenChange }: { leadId: string; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([{ itemNo: "1", description: "", unit: "", quantity: "", unitRate: "" }]);
  const [submitting, setSubmitting] = useState(false);

  function addLine() {
    setLines((prev) => [...prev, { itemNo: String(prev.length + 1), description: "", unit: "", quantity: "", unitRate: "" }]);
  }
  function updateLine(index: number, patch: Partial<(typeof lines)[number]>) {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (lines.some((l) => !l.description || !l.unit || !l.quantity || !l.unitRate)) {
      toast.error("Every line needs a description, unit, quantity, and rate.");
      return;
    }
    setSubmitting(true);
    const result = await createQuotationAction({
      leadId,
      validUntil,
      notes,
      lines: lines.map((l) => ({
        itemNo: l.itemNo,
        description: l.description,
        unit: l.unit,
        quantity: Number(l.quantity),
        unitRate: Number(l.unitRate),
      })),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Quotation created.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New quotation</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto py-2">
          <div className="space-y-1.5">
            <Label>Valid until</Label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={addLine}>
                <Plus className="size-3.5" aria-hidden /> Add line
              </Button>
            </div>
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-end gap-2">
                <Input placeholder="Description" value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} />
                <Input placeholder="Unit" value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} />
                <Input type="number" placeholder="Qty" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} />
                <Input type="number" placeholder="Rate" value={line.unitRate} onChange={(e) => updateLine(index, { unitRate: e.target.value })} />
                <Button type="button" size="icon-sm" variant="ghost" onClick={() => removeLine(index)}>
                  <Trash2 className="size-3.5" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
