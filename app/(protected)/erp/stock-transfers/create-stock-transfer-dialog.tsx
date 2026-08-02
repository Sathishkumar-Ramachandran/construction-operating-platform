"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
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
import { createStockTransferAction } from "@/actions/stock-transfer-actions";

type Option = { id: string; code: string; name: string };

export function CreateStockTransferDialog({
  warehouses,
  materials,
}: {
  warehouses: Option[];
  materials: (Option & { unit: string })[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [materialId, setMaterialId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!materialId || !fromWarehouseId || !toWarehouseId || !quantity) {
      toast.error("All fields are required.");
      return;
    }
    setSubmitting(true);
    const result = await createStockTransferAction({
      materialId,
      fromWarehouseId,
      toWarehouseId,
      quantity: Number(quantity),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Stock transfer created.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> New transfer
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New stock transfer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Material</Label>
              <Select value={materialId} onValueChange={(value) => setMaterialId(value ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select material" /></SelectTrigger>
                <SelectContent>
                  {materials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>From warehouse</Label>
                <Select value={fromWarehouseId} onValueChange={(value) => setFromWarehouseId(value ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>To warehouse</Label>
                <Select value={toWarehouseId} onValueChange={(value) => setToWarehouseId(value ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Destination" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
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
