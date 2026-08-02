"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { updateTenderDetailsAction, setTenderBoqLinesAction, advanceTenderStatusAction } from "@/actions/tender-actions";
import {
  TENDER_STATUS_LABELS,
  TENDER_EVALUATION_METHOD_LABELS,
  type TenderStatus,
} from "@/lib/crm/constants";

type PricingLine = { id: string; itemNo: string; description: string; unit: string; quantity: string; unitRate: string; amount: string };

type Tender = {
  id: string;
  status: string;
  tenderReferenceNo: string | null;
  issuingBody: string | null;
  noticeDate: string | null;
  documentCollectionDeadline: string | null;
  siteVisitMandatory: boolean;
  siteVisitDate: string | null;
  queryDeadline: string | null;
  submissionDeadline: string | null;
  tenderBondAmount: string | null;
  evaluationMethod: string | null;
  boqTotal: string | null;
  bidAmount: string | null;
  lines: PricingLine[];
};

const NEXT_STATUS_OPTIONS: Record<string, string[]> = {
  DOCUMENT_COLLECTION: ["SITE_VISIT", "QUERY_CLARIFICATION", "PRICING"],
  SITE_VISIT: ["QUERY_CLARIFICATION", "PRICING"],
  QUERY_CLARIFICATION: ["PRICING"],
  PRICING: ["SUBMITTED"],
  SUBMITTED: ["OPENED"],
  OPENED: ["UNDER_EVALUATION", "AWARDED", "NOT_AWARDED"],
  UNDER_EVALUATION: ["AWARDED", "NOT_AWARDED"],
  AWARDED: [],
  NOT_AWARDED: [],
  WITHDRAWN: [],
};

export function TenderPanel({ leadId, tender, canManage }: { leadId: string; tender: Tender; canManage: boolean }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{TENDER_STATUS_LABELS[tender.status as TenderStatus]}</Badge>
        {canManage ? <StatusAdvancer leadId={leadId} tenderId={tender.id} status={tender.status} /> : null}
      </div>

      <TenderDetailsForm leadId={leadId} tender={tender} canManage={canManage} />
      <BoqLinesEditor leadId={leadId} tender={tender} canManage={canManage} />
    </div>
  );
}

function StatusAdvancer({ leadId, tenderId, status }: { leadId: string; tenderId: string; status: string }) {
  const router = useRouter();
  const options = NEXT_STATUS_OPTIONS[status] ?? [];
  const [next, setNext] = useState(options[0] ?? "");
  const [submitting, setSubmitting] = useState(false);

  if (options.length === 0) return null;

  async function handleAdvance() {
    if (!next) return;
    setSubmitting(true);
    const result = await advanceTenderStatusAction(tenderId, leadId, { status: next });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Tender moved to ${TENDER_STATUS_LABELS[next as TenderStatus]}.`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={next} onValueChange={(value) => setNext(value ?? options[0])}>
        <SelectTrigger size="sm" className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt} value={opt}>{TENDER_STATUS_LABELS[opt as TenderStatus]}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" disabled={submitting} onClick={handleAdvance}>
        Advance
      </Button>
    </div>
  );
}

function TenderDetailsForm({ leadId, tender, canManage }: { leadId: string; tender: Tender; canManage: boolean }) {
  const router = useRouter();
  const [tenderReferenceNo, setTenderReferenceNo] = useState(tender.tenderReferenceNo ?? "");
  const [issuingBody, setIssuingBody] = useState(tender.issuingBody ?? "");
  const [documentCollectionDeadline, setDocumentCollectionDeadline] = useState(tender.documentCollectionDeadline?.slice(0, 10) ?? "");
  const [siteVisitMandatory, setSiteVisitMandatory] = useState(tender.siteVisitMandatory);
  const [siteVisitDate, setSiteVisitDate] = useState(tender.siteVisitDate?.slice(0, 10) ?? "");
  const [submissionDeadline, setSubmissionDeadline] = useState(tender.submissionDeadline?.slice(0, 10) ?? "");
  const [tenderBondAmount, setTenderBondAmount] = useState(tender.tenderBondAmount ?? "");
  const [evaluationMethod, setEvaluationMethod] = useState(tender.evaluationMethod ?? "");
  const [bidAmount, setBidAmount] = useState(tender.bidAmount ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    const result = await updateTenderDetailsAction(tender.id, leadId, {
      tenderReferenceNo,
      issuingBody,
      documentCollectionDeadline,
      siteVisitMandatory,
      siteVisitDate,
      submissionDeadline,
      tenderBondAmount: tenderBondAmount || undefined,
      evaluationMethod: evaluationMethod || undefined,
      bidAmount: bidAmount || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Tender details saved.");
    router.refresh();
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <h4 className="text-sm font-semibold text-foreground">Tender details</h4>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Tender reference no.</Label>
          <Input value={tenderReferenceNo} onChange={(e) => setTenderReferenceNo(e.target.value)} disabled={!canManage} />
        </div>
        <div className="space-y-1.5">
          <Label>Issuing body</Label>
          <Input value={issuingBody} onChange={(e) => setIssuingBody(e.target.value)} placeholder="e.g. HDB" disabled={!canManage} />
        </div>
        <div className="space-y-1.5">
          <Label>Document collection deadline</Label>
          <Input type="date" value={documentCollectionDeadline} onChange={(e) => setDocumentCollectionDeadline(e.target.value)} disabled={!canManage} />
        </div>
        <div className="space-y-1.5">
          <Label>Submission deadline</Label>
          <Input type="date" value={submissionDeadline} onChange={(e) => setSubmissionDeadline(e.target.value)} disabled={!canManage} />
        </div>
        <div className="space-y-1.5">
          <Label>Site visit date</Label>
          <Input type="date" value={siteVisitDate} onChange={(e) => setSiteVisitDate(e.target.value)} disabled={!canManage} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Site visit mandatory</Label>
          <Switch checked={siteVisitMandatory} onCheckedChange={setSiteVisitMandatory} disabled={!canManage} />
        </div>
        <div className="space-y-1.5">
          <Label>Tender bond amount ($)</Label>
          <Input type="number" value={tenderBondAmount} onChange={(e) => setTenderBondAmount(e.target.value)} disabled={!canManage} />
        </div>
        <div className="space-y-1.5">
          <Label>Evaluation method</Label>
          <Select value={evaluationMethod} onValueChange={(value) => setEvaluationMethod(value ?? "")} disabled={!canManage}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select method" /></SelectTrigger>
            <SelectContent>
              {Object.entries(TENDER_EVALUATION_METHOD_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Bid amount ($)</Label>
          <Input type="number" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} disabled={!canManage} />
        </div>
      </div>
      {canManage ? (
        <Button size="sm" disabled={submitting} onClick={handleSave}>
          {submitting ? "Saving…" : "Save details"}
        </Button>
      ) : null}
    </div>
  );
}

function BoqLinesEditor({ leadId, tender, canManage }: { leadId: string; tender: Tender; canManage: boolean }) {
  const router = useRouter();
  const [lines, setLines] = useState(
    tender.lines.map((l) => ({ itemNo: l.itemNo, description: l.description, unit: l.unit, quantity: l.quantity, unitRate: l.unitRate }))
  );
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

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitRate) || 0), 0);

  async function handleSave() {
    setSubmitting(true);
    const result = await setTenderBoqLinesAction(tender.id, leadId, {
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
    toast.success("BOQ saved.");
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Bill of Quantities (BOQ)</h4>
        {canManage ? (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={addLine}>
            <Plus className="size-3.5" aria-hidden /> Add line
          </Button>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Rate</TableHead>
            {canManage ? <TableHead /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, index) => (
            <TableRow key={index}>
              <TableCell><Input value={line.itemNo} onChange={(e) => updateLine(index, { itemNo: e.target.value })} disabled={!canManage} className="w-16" /></TableCell>
              <TableCell><Input value={line.description} onChange={(e) => updateLine(index, { description: e.target.value })} disabled={!canManage} /></TableCell>
              <TableCell><Input value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} disabled={!canManage} className="w-20" /></TableCell>
              <TableCell><Input type="number" value={line.quantity} onChange={(e) => updateLine(index, { quantity: e.target.value })} disabled={!canManage} className="w-20" /></TableCell>
              <TableCell><Input type="number" value={line.unitRate} onChange={(e) => updateLine(index, { unitRate: e.target.value })} disabled={!canManage} className="w-24" /></TableCell>
              {canManage ? (
                <TableCell>
                  <Button size="icon-sm" variant="ghost" onClick={() => removeLine(index)}>
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-right text-sm font-semibold text-foreground">BOQ Total: ${total.toFixed(2)}</p>
      {canManage ? (
        <Button size="sm" disabled={submitting} onClick={handleSave}>
          {submitting ? "Saving…" : "Save BOQ"}
        </Button>
      ) : null}
    </div>
  );
}
