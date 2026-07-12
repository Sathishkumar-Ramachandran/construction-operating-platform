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
import { MasterDataPage } from "@/components/hr/master-data-page";
import { saveEmploymentGradeAction, setEmploymentGradeActiveAction } from "@/actions/hr-master-data-actions";

export function GradesSettings() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <MasterDataPage
      apiType="grades"
      extraColumns={[{ header: "Rank", render: (row) => String(row.rank ?? "—") }]}
      onToggleActive={async (row, isActive) => {
        const result = await setEmploymentGradeActiveAction({ id: row.id, isActive });
        if (!result.ok) throw new Error(result.message);
      }}
      renderCreateAction={(onCreated) => (
        <>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New grade
          </Button>
          {createOpen ? <CreateGradeDialog onOpenChange={setCreateOpen} onCreated={onCreated} /> : null}
        </>
      )}
    />
  );
}

function CreateGradeDialog({
  onOpenChange,
  onCreated,
}: {
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [rank, setRank] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveEmploymentGradeAction({ code: code.toUpperCase(), name, rank: Number(rank) });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Grade created.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New employment grade</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. G5" />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grade 5" />
          </div>
          <div className="space-y-1.5">
            <Label>Rank</Label>
            <Input type="number" value={rank} onChange={(e) => setRank(e.target.value)} />
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
