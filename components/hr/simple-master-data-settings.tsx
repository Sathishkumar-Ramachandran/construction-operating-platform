"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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

/** Reused for the simplest master-data types: just code + name. */
export function SimpleMasterDataSettings({
  apiType,
  entityLabel,
  saveAction,
  toggleAction,
}: {
  apiType: string;
  entityLabel: string;
  saveAction: (input: { code: string; name: string }) => Promise<ActionResult>;
  toggleAction: (input: { id: string; isActive: boolean }) => Promise<ActionResult>;
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <MasterDataPage
      apiType={apiType}
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
            <CreateDialog
              entityLabel={entityLabel}
              saveAction={saveAction}
              onOpenChange={setCreateOpen}
              onCreated={onCreated}
            />
          ) : null}
        </>
      )}
    />
  );
}

function CreateDialog({
  entityLabel,
  saveAction,
  onOpenChange,
  onCreated,
}: {
  entityLabel: string;
  saveAction: (input: { code: string; name: string }) => Promise<ActionResult>;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveAction({ code: code.toUpperCase(), name });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`${entityLabel} created.`);
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {entityLabel}</DialogTitle>
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
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
