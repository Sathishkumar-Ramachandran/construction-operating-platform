"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { updateProjectAction, activateProjectAction, closeProjectAction, createSiteAction } from "@/actions/project-actions";
import { SITE_STAGE_LABELS, isFinalSiteStage } from "@/lib/projects/constants";
import type { ProjectView } from "@/app/(protected)/projects/[id]/types";

function formatCurrency(value: number | null) {
  if (value == null) return "—";
  return `$${value.toLocaleString()}`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function ProjectOverviewPanel({
  project,
  canManageProject,
}: {
  project: ProjectView;
  canManageProject: boolean;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [activating, setActivating] = useState(false);

  async function handleActivate() {
    setActivating(true);
    const result = await activateProjectAction({ id: project.id });
    setActivating(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Project activated.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {canManageProject ? (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" aria-hidden /> Edit
          </Button>
        ) : null}
        {canManageProject && project.status === "DRAFT" ? (
          <Button size="sm" onClick={handleActivate} disabled={activating}>
            {activating ? "Activating…" : "Activate"}
          </Button>
        ) : null}
        {canManageProject && project.status === "ACTIVE" ? (
          <Button size="sm" variant="outline" onClick={() => setCloseOpen(true)}>
            Close project
          </Button>
        ) : null}
      </div>

      <dl className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <InfoField label="Code" value={project.code} />
        <InfoField label="Name" value={project.name} />
        <InfoField label="Client" value={project.clientName ?? "—"} />
        <InfoField label="Estimated budget" value={formatCurrency(project.estimatedBudget)} />
        <InfoField label="Start date" value={formatDate(project.startDate)} />
        <InfoField label="End date" value={formatDate(project.endDate)} />
        <InfoField label="Address" value={project.address ?? "—"} />
        <InfoField label="Created" value={formatDate(project.createdAt)} />
        <div className="sm:col-span-2">
          <InfoField label="Description" value={project.description ?? "—"} />
        </div>
      </dl>

      <div className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Sites</h4>
          {canManageProject ? (
            <Button size="sm" variant="outline" onClick={() => setAddSiteOpen(true)}>
              Add site
            </Button>
          ) : null}
        </div>
        {project.sites.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No sites yet. Add a site here, then track its progress from the Phases tab.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {project.sites.map((site) => (
              <li key={site.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{site.name}</p>
                  <p className="text-xs text-muted-foreground">{site.code}</p>
                </div>
                <Badge variant="outline">
                  {isFinalSiteStage(site.currentStage) ? "Complete" : SITE_STAGE_LABELS[site.currentStage]}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editOpen ? (
        <EditProjectDialog project={project} onOpenChange={setEditOpen} onSaved={() => router.refresh()} />
      ) : null}
      {closeOpen ? (
        <CloseProjectDialog project={project} onOpenChange={setCloseOpen} onClosed={() => router.refresh()} />
      ) : null}
      {addSiteOpen ? (
        <AddSiteDialog projectId={project.id} onOpenChange={setAddSiteOpen} onCreated={() => router.refresh()} />
      ) : null}
    </div>
  );
}

function AddSiteDialog({
  projectId,
  onOpenChange,
  onCreated,
}: {
  projectId: string;
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
    const result = await createSiteAction({ projectId, code, name });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Site created.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add site</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SITE-A" />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
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

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function EditProjectDialog({
  project,
  onOpenChange,
  onSaved,
}: {
  project: ProjectView;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(project.code);
  const [name, setName] = useState(project.name);
  const [clientName, setClientName] = useState(project.clientName ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [address, setAddress] = useState(project.address ?? "");
  const [estimatedBudget, setEstimatedBudget] = useState(
    project.estimatedBudget != null ? String(project.estimatedBudget) : ""
  );
  const [startDate, setStartDate] = useState(project.startDate ? project.startDate.slice(0, 10) : "");
  const [endDate, setEndDate] = useState(project.endDate ? project.endDate.slice(0, 10) : "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await updateProjectAction({
      id: project.id,
      code: code.toUpperCase(),
      name,
      clientName,
      description,
      address,
      estimatedBudget: estimatedBudget ? Number(estimatedBudget) : undefined,
      startDate,
      endDate,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Project updated.");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estimated budget</Label>
              <Input
                type="number"
                min={0}
                value={estimatedBudget}
                onChange={(e) => setEstimatedBudget(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Client name</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseProjectDialog({
  project,
  onOpenChange,
  onClosed,
}: {
  project: ProjectView;
  onOpenChange: (open: boolean) => void;
  onClosed: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const incompleteSites = project.sites.filter((site) => site.currentStage !== "HANDOVER_DOCUMENTATION");

  async function handleSubmit() {
    setSubmitting(true);
    const result = await closeProjectAction({ id: project.id, notes });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Project closed.");
    onOpenChange(false);
    onClosed();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close project</DialogTitle>
          <DialogDescription>This marks the project as closed. It cannot be reopened.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {incompleteSites.length > 0 && project.sites.length > 0 ? (
            <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm text-foreground">
              {incompleteSites.length} of {project.sites.length} sites haven&apos;t reached Handover &amp;
              Documentation yet — you can still close.
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Closing…" : "Close project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
