"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { MasterDataPage, type MasterDataRow } from "@/components/hr/master-data-page";
import { saveMaterialAction, setMaterialActiveAction } from "@/actions/erp-actions";
import { MaterialType, MATERIAL_TYPE_LABELS } from "@/lib/erp/constants";

type MaterialCategoryOption = { id: string; code: string; name: string; isActive?: boolean };

function useMaterialCategories() {
  return useQuery<MaterialCategoryOption[]>({
    queryKey: ["/api/erp-settings", "material-categories"],
    queryFn: async () => {
      const res = await fetch("/api/erp-settings/material-categories");
      if (!res.ok) throw new Error("Failed to load material categories.");
      const { items } = await res.json();
      return items;
    },
    staleTime: 60_000,
  });
}

export function MaterialsSettings() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<MasterDataRow | null>(null);

  return (
    <MasterDataPage
      apiType="materials"
      apiBasePath="/api/erp-settings"
      queryKeyPrefix="/api/erp-settings"
      extraColumns={[
        { header: "Type", render: (row) => MATERIAL_TYPE_LABELS[row.type as keyof typeof MATERIAL_TYPE_LABELS] ?? String(row.type) },
        { header: "Unit", render: (row) => String(row.unit ?? "—") },
        {
          header: "Stock on hand",
          render: (row) => {
            const stockLevel = row.stockLevel as { quantityOnHand: string | number } | null | undefined;
            return stockLevel ? String(stockLevel.quantityOnHand) : "0";
          },
        },
      ]}
      onToggleActive={async (row, isActive) => {
        const result = await setMaterialActiveAction({ id: row.id, isActive });
        if (!result.ok) throw new Error(result.message);
      }}
      renderCreateAction={(onCreated) => (
        <>
          <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
            <Plus className="size-4" aria-hidden /> New material
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
                type: String(row.type ?? MaterialType.MATERIAL),
                categoryId: (row.category as { id: string } | null)?.id ?? "",
                unit: String(row.unit ?? ""),
                referenceCost: row.referenceCost != null ? String(row.referenceCost) : "",
                reorderLevel: row.reorderLevel != null ? String(row.reorderLevel) : "",
                notes: String(row.notes ?? ""),
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
    type: string;
    categoryId: string;
    unit: string;
    referenceCost: string;
    reorderLevel: string;
    notes: string;
  };
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(initial?.id);
  const { data: categories = [] } = useMaterialCategories();
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? MaterialType.MATERIAL);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [referenceCost, setReferenceCost] = useState(initial?.referenceCost ?? "");
  const [reorderLevel, setReorderLevel] = useState(initial?.reorderLevel ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  const activeCategories = categories.filter((c) => c.isActive !== false);

  async function handleSubmit() {
    if (!code || !name || !unit) {
      toast.error("Code, name, and unit are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveMaterialAction({
      id: initial?.id,
      code: code.toUpperCase(),
      name,
      type,
      categoryId: categoryId || undefined,
      unit,
      referenceCost: referenceCost ? Number(referenceCost) : undefined,
      reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
      notes,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Material ${isEdit ? "updated" : "created"}.`);
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit material" : "New material"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. MAT-0001" />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => v && setType(v)}
                items={Object.values(MaterialType).map((t) => ({ value: t, label: MATERIAL_TYPE_LABELS[t] }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(MaterialType).map((t) => (
                    <SelectItem key={t} value={t}>
                      {MATERIAL_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Category (optional)</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => setCategoryId(v ?? "")}
              items={activeCategories.map((c) => ({ value: c.id, label: c.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No category" />
              </SelectTrigger>
              <SelectContent>
                {activeCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g. litres" />
            </div>
            <div className="space-y-1.5">
              <Label>Reference cost</Label>
              <Input
                type="number"
                min={0}
                value={referenceCost}
                onChange={(e) => setReferenceCost(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reorder level</Label>
              <Input
                type="number"
                min={0}
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
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
