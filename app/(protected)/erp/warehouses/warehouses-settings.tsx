"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { saveWarehouseAction, setWarehouseActiveAction } from "@/actions/warehouse-actions";

export type WarehouseRow = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  isActive: boolean;
  managedByEmployeeId: string | null;
  managedByEmployee: { id: string; firstName: string; lastName: string | null; preferredName: string | null } | null;
};

export function WarehousesSettings({ warehouses }: { warehouses: WarehouseRow[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editRow, setEditRow] = useState<WarehouseRow | null>(null);
  const router = useRouter();

  async function handleToggleActive(row: WarehouseRow, isActive: boolean) {
    const result = await setWarehouseActiveAction({ id: row.id, isActive });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden /> New warehouse
        </Button>
        {createOpen ? <WarehouseDialog onOpenChange={setCreateOpen} /> : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {warehouses.map((warehouse) => (
            <TableRow key={warehouse.id}>
              <TableCell className="font-medium">{warehouse.code}</TableCell>
              <TableCell>{warehouse.name}</TableCell>
              <TableCell className="text-muted-foreground">{warehouse.address ?? "—"}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch checked={warehouse.isActive} onCheckedChange={(checked) => handleToggleActive(warehouse, checked)} />
                  <Badge variant="outline">{warehouse.isActive ? "Active" : "Inactive"}</Badge>
                </div>
              </TableCell>
              <TableCell>
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditRow(warehouse)}>
                  <Pencil className="size-3.5" aria-hidden /> Edit
                </Button>
                {editRow?.id === warehouse.id ? (
                  <WarehouseDialog initial={warehouse} onOpenChange={(open) => !open && setEditRow(null)} />
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function WarehouseDialog({
  initial,
  onOpenChange,
}: {
  initial?: WarehouseRow;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [code, setCode] = useState(initial?.code ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveWarehouseAction(initial?.id ?? null, { code: code.toUpperCase(), name, address });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(initial ? "Warehouse updated." : "Warehouse created.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? "Edit warehouse" : "New warehouse"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. MAIN" />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Main Warehouse" />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
