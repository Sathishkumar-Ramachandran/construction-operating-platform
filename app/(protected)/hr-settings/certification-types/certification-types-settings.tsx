"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MasterDataPage, type MasterDataRow } from "@/components/hr/master-data-page";
import { saveCertificationTypeAction, setCertificationTypeActiveAction } from "@/actions/hr-master-data-actions";

const DEFAULT_REMINDER_DAYS = [90, 60, 30, 14, 7];

export function CertificationTypesSettings() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<MasterDataRow | null>(null);

  return (
    <MasterDataPage
      apiType="certification-types"
      extraColumns={[
        { header: "Issuing authority", render: (row) => (row.issuingAuthority as string | null) ?? "—" },
        { header: "Validity (months)", render: (row) => (row.defaultValidityMonths as number | null) ?? "—" },
      ]}
      onToggleActive={async (row, isActive) => {
        const result = await setCertificationTypeActiveAction({ id: row.id, isActive });
        if (!result.ok) throw new Error(result.message);
      }}
      renderCreateAction={(onCreated) => (
        <>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New certification type
          </Button>
          {createOpen ? <SaveDialog onOpenChange={setCreateOpen} onSaved={onCreated} /> : null}
        </>
      )}
      renderRowActions={(row, onUpdated) => (
        <>
          <Button variant="outline" size="sm" onClick={() => setEditRow(row)} className="gap-1.5">
            <Pencil className="size-3.5" aria-hidden /> Edit
          </Button>
          {editRow?.id === row.id ? (
            <SaveDialog
              initial={{
                id: row.id,
                code: row.code,
                name: row.name,
                issuingAuthority: (row.issuingAuthority as string | null) ?? "",
                requiresExpiryDate: Boolean(row.requiresExpiryDate),
                defaultValidityMonths:
                  row.defaultValidityMonths != null ? String(row.defaultValidityMonths) : "",
                reminderDays: (row.reminderDays as number[] | undefined) ?? DEFAULT_REMINDER_DAYS,
              }}
              onOpenChange={(open) => !open && setEditRow(null)}
              onSaved={() => {
                setEditRow(null);
                onUpdated();
              }}
            />
          ) : null}
        </>
      )}
    />
  );
}

function SaveDialog({
  initial,
  onOpenChange,
  onSaved,
}: {
  initial?: {
    id: string;
    code: string;
    name: string;
    issuingAuthority: string;
    requiresExpiryDate: boolean;
    defaultValidityMonths: string;
    reminderDays: number[];
  };
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [issuingAuthority, setIssuingAuthority] = useState(initial?.issuingAuthority ?? "");
  const [requiresExpiryDate, setRequiresExpiryDate] = useState(initial?.requiresExpiryDate ?? true);
  const [defaultValidityMonths, setDefaultValidityMonths] = useState(initial?.defaultValidityMonths ?? "");
  const [reminderDays] = useState<number[]>(initial?.reminderDays ?? DEFAULT_REMINDER_DAYS);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveCertificationTypeAction({
      id: initial?.id,
      code: code.toUpperCase(),
      name,
      issuingAuthority,
      requiresExpiryDate,
      defaultValidityMonths: defaultValidityMonths ? Number(defaultValidityMonths) : null,
      reminderDays,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Certification type ${isEdit ? "updated" : "created"}.`);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit certification type" : "New certification type"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Issuing authority</Label>
            <Input value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Default validity (months, optional)</Label>
            <Input type="number" value={defaultValidityMonths} onChange={(e) => setDefaultValidityMonths(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={requiresExpiryDate} onCheckedChange={(v) => setRequiresExpiryDate(v === true)} />
            Requires expiry date
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
