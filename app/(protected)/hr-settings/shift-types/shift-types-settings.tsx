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
import { saveShiftTypeAction, setShiftTypeActiveAction } from "@/actions/hr-master-data-actions";

export function ShiftTypesSettings() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<MasterDataRow | null>(null);

  return (
    <MasterDataPage
      apiType="shift-types"
      extraColumns={[
        { header: "Start", render: (row) => String(row.startTime ?? "—") },
        { header: "End", render: (row) => String(row.endTime ?? "—") },
        { header: "Grace (min)", render: (row) => String(row.gracePeriodMinutes ?? "—") },
      ]}
      onToggleActive={async (row, isActive) => {
        const result = await setShiftTypeActiveAction({ id: row.id, isActive });
        if (!result.ok) throw new Error(result.message);
      }}
      renderCreateAction={(onCreated) => (
        <>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New shift
          </Button>
          {createOpen ? <SaveShiftTypeDialog onOpenChange={setCreateOpen} onSaved={onCreated} /> : null}
        </>
      )}
      renderRowActions={(row, onUpdated) => (
        <>
          <Button variant="outline" size="sm" onClick={() => setEditRow(row)} className="gap-1.5">
            <Pencil className="size-3.5" aria-hidden /> Edit
          </Button>
          {editRow?.id === row.id ? (
            <SaveShiftTypeDialog
              initial={{
                id: row.id,
                code: row.code,
                name: row.name,
                startTime: String(row.startTime ?? "08:00"),
                endTime: String(row.endTime ?? "17:00"),
                gracePeriodMinutes: String(row.gracePeriodMinutes ?? "15"),
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

function SaveShiftTypeDialog({
  initial,
  onOpenChange,
  onSaved,
}: {
  initial?: {
    id: string;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
    gracePeriodMinutes: string;
  };
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [startTime, setStartTime] = useState(initial?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "17:00");
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(initial?.gracePeriodMinutes ?? "15");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveShiftTypeAction({
      id: initial?.id,
      code: code.toUpperCase(),
      name,
      startTime,
      endTime,
      gracePeriodMinutes: Number(gracePeriodMinutes),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Shift type ${isEdit ? "updated" : "created"}.`);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit shift type" : "New shift type"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. DAY_SHIFT" />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Day Shift" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Grace period (minutes)</Label>
            <Input
              type="number"
              value={gracePeriodMinutes}
              onChange={(e) => setGracePeriodMinutes(e.target.value)}
            />
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
