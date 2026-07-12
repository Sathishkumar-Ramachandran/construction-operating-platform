"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { createProjectAction, createSiteAction } from "@/actions/project-actions";

type Site = { id: string; code: string; name: string };
type Project = { id: string; code: string; name: string; clientName: string | null; sites: Site[] };

export function ProjectsSettings() {
  const { data, isLoading, refetch } = useQuery<{ projects: Project[] }>({
    queryKey: ["projects", "all"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects.");
      return res.json();
    },
  });

  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [siteDialogProjectId, setSiteDialogProjectId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreateProjectOpen(true)} className="gap-1.5">
          <Plus className="size-4" aria-hidden /> New project
        </Button>
      </div>

      {isLoading ? (
        <LoadingState rows={3} />
      ) : !data || data.projects.length === 0 ? (
        <EmptyState title="No projects yet" description="Create a project so employees can be allocated to it." />
      ) : (
        <ul className="space-y-3">
          {data.projects.map((project) => (
            <li key={project.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.code}{project.clientName ? ` · ${project.clientName}` : ""}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSiteDialogProjectId(project.id)}>
                  Add site
                </Button>
              </div>
              {project.sites.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.sites.map((site) => (
                    <Badge key={site.id} variant="outline">
                      {site.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {createProjectOpen ? (
        <CreateProjectDialog onOpenChange={setCreateProjectOpen} onCreated={() => refetch()} />
      ) : null}
      {siteDialogProjectId ? (
        <CreateSiteDialog
          projectId={siteDialogProjectId}
          projects={data?.projects ?? []}
          onOpenChange={() => setSiteDialogProjectId(null)}
          onCreated={() => refetch()}
        />
      ) : null}
    </div>
  );
}

function CreateProjectDialog({
  onOpenChange,
  onCreated,
}: {
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await createProjectAction({ code: code.toUpperCase(), name, clientName });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Project created.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. PRJ-001" />
          </div>
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Client name (optional)</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
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

function CreateSiteDialog({
  projectId,
  projects,
  onOpenChange,
  onCreated,
}: {
  projectId: string;
  projects: Project[];
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(projectId);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await createSiteAction({ projectId: selectedProjectId, code, name });
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
          <DialogTitle>New site</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={selectedProjectId} onValueChange={(v) => v && setSelectedProjectId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
