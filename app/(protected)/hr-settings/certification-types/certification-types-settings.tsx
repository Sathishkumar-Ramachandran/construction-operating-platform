"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { MasterDataPage } from "@/components/hr/master-data-page";
import { saveCertificationTypeAction, setCertificationTypeActiveAction } from "@/actions/hr-master-data-actions";

export function CertificationTypesSettings() {
  const [createOpen, setCreateOpen] = useState(false);

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
          {createOpen ? <CreateDialog onOpenChange={setCreateOpen} onCreated={onCreated} /> : null}
        </>
      )}
    />
  );
}

function CreateDialog({
  onOpenChange,
  onCreated,
}: {
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [requiresExpiryDate, setRequiresExpiryDate] = useState(true);
  const [defaultValidityMonths, setDefaultValidityMonths] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveCertificationTypeAction({
      code: code.toUpperCase(),
      name,
      issuingAuthority,
      requiresExpiryDate,
      defaultValidityMonths: defaultValidityMonths ? Number(defaultValidityMonths) : null,
      reminderDays: [90, 60, 30, 14, 7],
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Certification type created.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New certification type</DialogTitle>
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
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
