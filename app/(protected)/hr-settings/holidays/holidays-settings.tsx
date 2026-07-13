"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { saveHolidayAction, deleteHolidayAction } from "@/actions/hr-master-data-actions";

type HolidayRow = { id: string; date: string; name: string; description: string | null };

export function HolidaysSettings() {
  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<HolidayRow | null>(null);

  const { data, isLoading, refetch } = useQuery<HolidayRow[]>({
    queryKey: ["hr-settings", "holidays"],
    queryFn: async () => {
      const res = await fetch("/api/hr-settings/holidays");
      if (!res.ok) throw new Error("Failed to load.");
      const { items } = await res.json();
      return items;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-4" aria-hidden /> New holiday
        </Button>
        {createOpen ? (
          <CreateHolidayDialog onOpenChange={setCreateOpen} onCreated={() => refetch()} />
        ) : null}
      </div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Plus} title="No holidays yet" description="Add the company's holidays so attendance isn't marked absent on those dates." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(row.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.description ?? "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => setDeleting(row)}>
                      <Trash2 className="size-3.5" aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmationDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete holiday"
        description={deleting ? `Remove ${deleting.name} (${new Date(deleting.date).toLocaleDateString()})?` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteHolidayAction({ id: deleting.id });
          if (!result.ok) {
            toast.error(result.message);
            throw new Error(result.message);
          }
          toast.success("Holiday removed.");
          refetch();
        }}
      />
    </div>
  );
}

function CreateHolidayDialog({
  onOpenChange,
  onCreated,
}: {
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!date || !name) {
      toast.error("Date and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await saveHolidayAction({ date, name, description });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Holiday added.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New holiday</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. National Day" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Add holiday"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
