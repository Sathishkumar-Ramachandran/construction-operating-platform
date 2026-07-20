"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createProjectAction } from "@/actions/project-actions";

function emptyForm() {
  return {
    code: "",
    name: "",
    clientName: "",
    description: "",
    address: "",
    estimatedBudget: "",
    startDate: "",
    endDate: "",
  };
}

export function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof ReturnType<typeof emptyForm>, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm());
  }

  async function handleSubmit() {
    if (!form.code || !form.name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await createProjectAction({
      code: form.code.toUpperCase(),
      name: form.name,
      clientName: form.clientName,
      description: form.description,
      address: form.address,
      estimatedBudget: form.estimatedBudget ? Number(form.estimatedBudget) : undefined,
      startDate: form.startDate,
      endDate: form.endDate,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Project created.");
    setOpen(false);
    resetForm();
    router.refresh();
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="size-4" aria-hidden /> New project
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Create a project shell — activate it once ready to allocate teams.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => update("code", e.target.value)}
                  placeholder="e.g. PRJ-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estimated budget</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.estimatedBudget}
                  onChange={(e) => update("estimatedBudget", e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Client name</Label>
              <Input
                value={form.clientName}
                onChange={(e) => update("clientName", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Start date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating…" : "Create project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
