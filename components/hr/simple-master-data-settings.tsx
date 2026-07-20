"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
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
import { MasterDataPage, type MasterDataRow } from "@/components/hr/master-data-page";
import type { ActionResult } from "@/actions/user-actions";

type SimpleMasterDataInput = { id?: string; code: string; name: string };

/** Reused for the simplest master-data types: just code + name. */
export function SimpleMasterDataSettings({
  apiType,
  apiBasePath,
  queryKeyPrefix,
  entityLabel,
  saveAction,
  toggleAction,
}: {
  apiType: string;
  apiBasePath?: string;
  queryKeyPrefix?: string;
  entityLabel: string;
  saveAction: (input: SimpleMasterDataInput) => Promise<ActionResult>;
  toggleAction: (input: { id: string; isActive: boolean }) => Promise<ActionResult>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<MasterDataRow | null>(null);

  return (
    <MasterDataPage
      apiType={apiType}
      apiBasePath={apiBasePath}
      queryKeyPrefix={queryKeyPrefix}
      onToggleActive={async (row: MasterDataRow, isActive) => {
        const result = await toggleAction({ id: row.id, isActive });
        if (!result.ok) throw new Error(result.message);
      }}
      renderCreateAction={(onCreated) => (
        <>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New {entityLabel}
          </Button>
          {createOpen ? (
            <SaveDialog
              entityLabel={entityLabel}
              saveAction={saveAction}
              onOpenChange={setCreateOpen}
              onSaved={onCreated}
            />
          ) : null}
        </>
      )}
      renderRowActions={(row, onUpdated) => (
        <>
          <Button variant="outline" size="sm" onClick={() => setEditRow(row)} className="gap-1.5">
            <Pencil className="size-3.5" aria-hidden /> Edit
          </Button>
          {editRow?.id === row.id ? (
            <SaveDialog
              entityLabel={entityLabel}
              saveAction={saveAction}
              initial={{ id: row.id, code: row.code, name: row.name }}
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
  entityLabel,
  saveAction,
  initial,
  onOpenChange,
  onSaved,
}: {
  entityLabel: string;
  saveAction: (input: SimpleMasterDataInput) => Promise<ActionResult>;
  initial?: SimpleMasterDataInput;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveAction({ id: initial?.id, code: code.toUpperCase(), name });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`${entityLabel} ${isEdit ? "updated" : "created"}.`);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${entityLabel}` : `New ${entityLabel}`}</DialogTitle>
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
