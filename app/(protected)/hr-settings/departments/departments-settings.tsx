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
import { saveDepartmentAction, setDepartmentActiveAction } from "@/actions/hr-master-data-actions";

export function DepartmentsSettings() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <MasterDataPage
      apiType="departments"
      extraColumns={[
        {
          header: "Parent",
          render: (row) => (row.parentDepartment as { name: string } | null)?.name ?? "—",
        },
        {
          header: "Employees",
          render: (row) => String((row._count as { employees: number } | undefined)?.employees ?? 0),
        },
      ]}
      onToggleActive={async (row, isActive) => {
        const result = await setDepartmentActiveAction({ id: row.id, isActive });
        if (!result.ok) throw new Error(result.message);
      }}
      renderCreateAction={(onCreated) => (
        <>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New department
          </Button>
          {createOpen ? (
            <CreateDepartmentDialog onOpenChange={setCreateOpen} onCreated={onCreated} />
          ) : null}
        </>
      )}
    />
  );
}

function CreateDepartmentDialog({
  onOpenChange,
  onCreated,
}: {
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
    const result = await saveDepartmentAction({ code: code.toUpperCase(), name });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Department created.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New department</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. OPS" />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operations" />
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
