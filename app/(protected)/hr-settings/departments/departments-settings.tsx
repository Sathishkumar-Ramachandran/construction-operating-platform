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
import { EmployeePicker } from "@/components/hr/employee-picker";
import { saveDepartmentAction, setDepartmentActiveAction } from "@/actions/hr-master-data-actions";

export function DepartmentsSettings() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<MasterDataRow | null>(null);

  return (
    <MasterDataPage
      apiType="departments"
      extraColumns={[
        {
          header: "Manager",
          render: (row) => {
            const manager = row.managerEmployee as
              | { firstName: string; lastName: string | null }
              | null;
            return manager ? [manager.firstName, manager.lastName].filter(Boolean).join(" ") : "—";
          },
        },
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
            <SaveDepartmentDialog onOpenChange={setCreateOpen} onSaved={onCreated} />
          ) : null}
        </>
      )}
      renderRowActions={(row, onUpdated) => (
        <>
          <Button variant="outline" size="sm" onClick={() => setEditRow(row)} className="gap-1.5">
            <Pencil className="size-3.5" aria-hidden /> Edit
          </Button>
          {editRow?.id === row.id ? (
            <SaveDepartmentDialog
              initial={{
                id: row.id,
                code: row.code,
                name: row.name,
                managerEmployeeId: (row.managerEmployee as { id: string } | null)?.id ?? null,
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

function SaveDepartmentDialog({
  initial,
  onOpenChange,
  onSaved,
}: {
  initial?: { id: string; code: string; name: string; managerEmployeeId: string | null };
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [managerEmployeeId, setManagerEmployeeId] = useState<string | null>(
    initial?.managerEmployeeId ?? null
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveDepartmentAction({
      id: initial?.id,
      code: code.toUpperCase(),
      name,
      managerEmployeeId,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Department ${isEdit ? "updated" : "created"}.`);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit department" : "New department"}</DialogTitle>
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
          <div className="space-y-1.5">
            <Label>Manager</Label>
            <EmployeePicker
              value={managerEmployeeId}
              onChange={setManagerEmployeeId}
              placeholder="Search employees (optional)…"
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
