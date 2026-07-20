"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MasterDataPage, type MasterDataRow } from "@/components/hr/master-data-page";
import { saveLeaveTypeAction, setLeaveTypeActiveAction } from "@/actions/hr-master-data-actions";

export function LeaveTypesSettings() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<MasterDataRow | null>(null);

  return (
    <MasterDataPage
      apiType="leave-types"
      extraColumns={[
        { header: "Entitlement", render: (row) => `${row.defaultEntitlementDays} days` },
        { header: "Paid", render: (row) => (row.isPaid ? "Yes" : "No") },
      ]}
      onToggleActive={async (row, isActive) => {
        const result = await setLeaveTypeActiveAction({ id: row.id, isActive });
        if (!result.ok) throw new Error(result.message);
      }}
      renderCreateAction={(onCreated) => (
        <>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New leave type
          </Button>
          {createOpen ? <SaveLeaveTypeDialog onOpenChange={setCreateOpen} onSaved={onCreated} /> : null}
        </>
      )}
      renderRowActions={(row, onUpdated) => (
        <>
          <Button variant="outline" size="sm" onClick={() => setEditRow(row)} className="gap-1.5">
            <Pencil className="size-3.5" aria-hidden /> Edit
          </Button>
          {editRow?.id === row.id ? (
            <SaveLeaveTypeDialog
              initial={{
                id: row.id,
                code: row.code,
                name: row.name,
                defaultEntitlementDays: String(row.defaultEntitlementDays ?? "0"),
                isPaid: row.isPaid !== false,
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

function SaveLeaveTypeDialog({
  initial,
  onOpenChange,
  onSaved,
}: {
  initial?: { id: string; code: string; name: string; defaultEntitlementDays: string; isPaid: boolean };
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [defaultEntitlementDays, setDefaultEntitlementDays] = useState(initial?.defaultEntitlementDays ?? "0");
  const [isPaid, setIsPaid] = useState(initial?.isPaid ?? true);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveLeaveTypeAction({
      id: initial?.id,
      code: code.toUpperCase(),
      name,
      defaultEntitlementDays: Number(defaultEntitlementDays),
      isPaid,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(isEdit ? "Leave type updated." : "Leave type created.");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit leave type" : "New leave type"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. AL" />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Annual Leave" />
          </div>
          <div className="space-y-1.5">
            <Label>Default entitlement days</Label>
            <Input
              type="number"
              step="0.5"
              value={defaultEntitlementDays}
              onChange={(e) => setDefaultEntitlementDays(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Paid leave</Label>
            <Switch checked={isPaid} onCheckedChange={setIsPaid} />
          </div>
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
