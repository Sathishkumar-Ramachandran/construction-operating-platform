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
import { saveDocumentTypeAction, setDocumentTypeActiveAction } from "@/actions/hr-master-data-actions";
import { DocumentTypeScope, type DocumentTypeScope as DocumentTypeScopeType } from "@/lib/hr/constants";

const DEFAULT_MIME_TYPES = "application/pdf,image/png,image/jpeg";

const SCOPE_OPTIONS: { value: DocumentTypeScopeType; label: string }[] = [
  { value: DocumentTypeScope.EMPLOYEE, label: "Employee" },
  { value: DocumentTypeScope.PROJECT, label: "Project / Lead" },
  { value: DocumentTypeScope.SUPPLIER, label: "Supplier" },
];

export function DocumentTypesSettings() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<MasterDataRow | null>(null);

  return (
    <MasterDataPage
      apiType="document-types"
      extraColumns={[
        {
          header: "Applies to",
          render: (row) => ((row.appliesTo as string[] | undefined) ?? []).join(", ") || "—",
        },
        { header: "Confidential", render: (row) => (row.isConfidential ? "Yes" : "No") },
        { header: "Expiry required", render: (row) => (row.requiresExpiryDate ? "Yes" : "No") },
      ]}
      onToggleActive={async (row, isActive) => {
        const result = await setDocumentTypeActiveAction({ id: row.id, isActive });
        if (!result.ok) throw new Error(result.message);
      }}
      renderCreateAction={(onCreated) => (
        <>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New document type
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
                appliesTo: (row.appliesTo as DocumentTypeScopeType[] | undefined) ?? [],
                requiresExpiryDate: Boolean(row.requiresExpiryDate),
                isConfidential: Boolean(row.isConfidential),
                allowedMimeTypes: ((row.allowedMimeTypes as string[] | undefined) ?? [])
                  .join(",") || DEFAULT_MIME_TYPES,
                maxSizeMb: String(
                  Math.round(Number(row.maximumFileSizeBytes ?? 10 * 1024 * 1024) / (1024 * 1024))
                ),
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
    appliesTo: DocumentTypeScopeType[];
    requiresExpiryDate: boolean;
    isConfidential: boolean;
    allowedMimeTypes: string;
    maxSizeMb: string;
  };
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [appliesTo, setAppliesTo] = useState<DocumentTypeScopeType[]>(initial?.appliesTo ?? []);
  const [requiresExpiryDate, setRequiresExpiryDate] = useState(initial?.requiresExpiryDate ?? false);
  const [isConfidential, setIsConfidential] = useState(initial?.isConfidential ?? false);
  const [allowedMimeTypes, setAllowedMimeTypes] = useState(initial?.allowedMimeTypes ?? DEFAULT_MIME_TYPES);
  const [maxSizeMb, setMaxSizeMb] = useState(initial?.maxSizeMb ?? "10");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    if (appliesTo.length === 0) {
      toast.error("Select at least one area this document type applies to.");
      return;
    }
    setSubmitting(true);
    const result = await saveDocumentTypeAction({
      id: initial?.id,
      code: code.toUpperCase(),
      name,
      appliesTo,
      requiresExpiryDate,
      isConfidential,
      allowedMimeTypes: allowedMimeTypes.split(",").map((v) => v.trim()).filter(Boolean),
      maximumFileSizeBytes: Number(maxSizeMb) * 1024 * 1024,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Document type ${isEdit ? "updated" : "created"}.`);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit document type" : "New document type"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SAFETY_CERTIFICATE" />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Allowed MIME types (comma-separated)</Label>
            <Input value={allowedMimeTypes} onChange={(e) => setAllowedMimeTypes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Maximum file size (MB)</Label>
            <Input type="number" value={maxSizeMb} onChange={(e) => setMaxSizeMb(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Applies to</Label>
            <div className="flex flex-wrap gap-4">
              {SCOPE_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={appliesTo.includes(option.value)}
                    onCheckedChange={(checked) =>
                      setAppliesTo((prev) =>
                        checked === true
                          ? [...prev, option.value]
                          : prev.filter((v) => v !== option.value)
                      )
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={requiresExpiryDate} onCheckedChange={(v) => setRequiresExpiryDate(v === true)} />
            Requires expiry date
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isConfidential} onCheckedChange={(v) => setIsConfidential(v === true)} />
            Confidential
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
