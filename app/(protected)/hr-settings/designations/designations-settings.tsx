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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MasterDataPage } from "@/components/hr/master-data-page";
import { saveDesignationAction, setDesignationActiveAction } from "@/actions/hr-master-data-actions";
import { useMasterDataOptions } from "@/components/hr/use-master-data-options";

export function DesignationsSettings() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <MasterDataPage
      apiType="designations"
      extraColumns={[
        { header: "Department", render: (row) => (row.department as { name: string } | null)?.name ?? "—" },
        { header: "Managerial", render: (row) => (row.isManagerial ? "Yes" : "No") },
        {
          header: "Required documents",
          render: (row) => {
            const required = row.requiredDocuments as
              | { documentType: { name: string } }[]
              | undefined;
            if (!required || required.length === 0) return "—";
            return required.map((r) => r.documentType.name).join(", ");
          },
        },
      ]}
      onToggleActive={async (row, isActive) => {
        const result = await setDesignationActiveAction({ id: row.id, isActive });
        if (!result.ok) throw new Error(result.message);
      }}
      renderCreateAction={(onCreated) => (
        <>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New designation
          </Button>
          {createOpen ? <CreateDesignationDialog onOpenChange={setCreateOpen} onCreated={onCreated} /> : null}
        </>
      )}
    />
  );
}

function CreateDesignationDialog({
  onOpenChange,
  onCreated,
}: {
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { data: departments } = useMasterDataOptions("departments");
  const { data: documentTypes } = useMasterDataOptions("document-types");

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [isManagerial, setIsManagerial] = useState(false);
  const [requiredDocumentTypeIds, setRequiredDocumentTypeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleRequiredDocumentType(id: string, checked: boolean) {
    setRequiredDocumentTypeIds((current) =>
      checked ? [...current, id] : current.filter((existing) => existing !== id)
    );
  }

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveDesignationAction({
      code: code.toUpperCase(),
      name,
      departmentId: departmentId || null,
      isManagerial,
      requiredDocumentTypeIds,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Designation created.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New designation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SITE_ENGINEER" />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Site Engineer" />
          </div>
          <div className="space-y-1.5">
            <Label>Department (optional)</Label>
            <Select value={departmentId} onValueChange={(v) => setDepartmentId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {(departments ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isManagerial} onCheckedChange={(v) => setIsManagerial(v === true)} />
            Managerial designation
          </label>
          <div className="space-y-1.5">
            <Label>Required documents</Label>
            <p className="text-xs text-muted-foreground">
              Employees in this designation will show these as missing until uploaded.
            </p>
            {(documentTypes ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No document types configured yet.</p>
            ) : (
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                {(documentTypes ?? []).map((type) => (
                  <label key={type.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={requiredDocumentTypeIds.includes(type.id)}
                      onCheckedChange={(v) => toggleRequiredDocumentType(type.id, v === true)}
                    />
                    {type.name}
                  </label>
                ))}
              </div>
            )}
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
