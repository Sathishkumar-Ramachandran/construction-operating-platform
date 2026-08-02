"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { postGoodsReceiptAction } from "@/actions/goods-receipt-actions";

type Line = { id: string; materialId: string; quantityOrdered: string; quantityReceived: string; material: { name: string; unit: string } };

export function GoodsReceiptDialog({ purchaseOrderId, lines }: { purchaseOrderId: string; lines: Line[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const outstandingLines = lines.filter((line) => Number(line.quantityReceived) < Number(line.quantityOrdered));

  async function handleSubmit() {
    const entries = Object.entries(quantities).filter(([, qty]) => qty && Number(qty) > 0);
    if (entries.length === 0) {
      toast.error("Enter at least one received quantity.");
      return;
    }
    setSubmitting(true);
    const result = await postGoodsReceiptAction({
      purchaseOrderId,
      lines: entries.map(([purchaseOrderLineId, qty]) => ({ purchaseOrderLineId, quantityReceived: Number(qty) })),
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Goods receipt posted.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button className="gap-1.5" onClick={() => setOpen(true)}>
        <PackageCheck className="size-4" aria-hidden /> Receive goods
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Post goods receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Receiving now</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outstandingLines.map((line) => {
                  const outstanding = Number(line.quantityOrdered) - Number(line.quantityReceived);
                  return (
                    <TableRow key={line.id}>
                      <TableCell>{line.material.name}</TableCell>
                      <TableCell>{outstanding} {line.material.unit}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          max={outstanding}
                          value={quantities[line.id] ?? ""}
                          onChange={(e) => setQuantities((prev) => ({ ...prev, [line.id]: e.target.value }))}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Posting…" : "Post receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
