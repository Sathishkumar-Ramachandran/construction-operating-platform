"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createPurchaseOrderAction } from "@/actions/purchase-order-actions";

type Option = { id: string; code: string; name: string };

type LineRow = { materialId: string; quantityOrdered: string; unitCost: string };

export function CreatePurchaseOrderDialog({
  suppliers,
  warehouses,
  materials,
}: {
  suppliers: Option[];
  warehouses: Option[];
  materials: (Option & { unit: string })[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [lines, setLines] = useState<LineRow[]>([{ materialId: "", quantityOrdered: "", unitCost: "" }]);
  const [submitting, setSubmitting] = useState(false);

  function addLine() {
    setLines((prev) => [...prev, { materialId: "", quantityOrdered: "", unitCost: "" }]);
  }
  function updateLine(index: number, patch: Partial<LineRow>) {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!supplierId || !warehouseId || lines.some((l) => !l.materialId)) {
      toast.error("Supplier, warehouse, and every line's material are required.");
      return;
    }
    setSubmitting(true);
    const result = await createPurchaseOrderAction({
      supplierId,
      warehouseId,
      expectedDeliveryDate,
      lines: lines.map((line) => ({
        materialId: line.materialId,
        quantityOrdered: Number(line.quantityOrdered),
        unitCost: Number(line.unitCost),
      })),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Purchase order created.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> New purchase order
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New purchase order</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-4 overflow-y-auto py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={(value) => setSupplierId(value ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Delivery warehouse</Label>
                <Select value={warehouseId} onValueChange={(value) => setWarehouseId(value ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expected delivery date</Label>
              <Input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line items</Label>
                <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={addLine}>
                  <Plus className="size-3.5" aria-hidden /> Add line
                </Button>
              </div>
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-2">
                  <Select value={line.materialId} onValueChange={(value) => updateLine(index, { materialId: value ?? "" })}>
                    <SelectTrigger size="sm" className="w-full"><SelectValue placeholder="Material" /></SelectTrigger>
                    <SelectContent>
                      {materials.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={line.quantityOrdered}
                    onChange={(e) => updateLine(index, { quantityOrdered: e.target.value })}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Unit cost"
                    value={line.unitCost}
                    onChange={(e) => updateLine(index, { unitCost: e.target.value })}
                  />
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => removeLine(index)}>
                    <Trash2 className="size-3.5" aria-hidden />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
