"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { EmptyState } from "@/components/shared/empty-state";
import { createAssignmentAction, endAssignmentAction } from "@/actions/allocation-actions";
import type { listAssignmentsForEmployee } from "@/lib/services/employee-allocation-service";

type Assignment = Awaited<ReturnType<typeof listAssignmentsForEmployee>>[number];

type ProjectOption = { id: string; code: string; name: string; sites: { id: string; code: string; name: string }[] };

export function AllocationPanel({
  employeeId,
  assignments,
  canManage,
}: {
  employeeId: string;
  assignments: Assignment[];
  canManage: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();

  const activeAllocation = assignments
    .filter((a) => a.status === "ACTIVE")
    .reduce((sum, a) => sum + a.allocationPercentage, 0);

  async function handleEnd(assignmentId: string) {
    const result = await endAssignmentAction({
      assignmentId,
      endDate: new Date().toISOString().slice(0, 10),
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Assignment ended.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Active allocation: <span className="font-medium text-foreground">{activeAllocation}%</span>
        </p>
        {canManage ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            New assignment
          </Button>
        ) : null}
      </div>

      {assignments.length === 0 ? (
        <EmptyState title="No project assignments" description="This employee hasn't been assigned to a project yet." />
      ) : (
        <ul className="space-y-2">
          {assignments.map((assignment) => (
            <li key={assignment.id} className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{assignment.project.name}</span>
                {assignment.site ? <span className="text-muted-foreground">· {assignment.site.name}</span> : null}
                <Badge variant="outline">{assignment.status}</Badge>
                <Badge variant="outline">{assignment.allocationPercentage}%</Badge>
                {assignment.isPrimary ? <Badge>Primary</Badge> : null}
                {canManage && assignment.status === "ACTIVE" ? (
                  <Button size="sm" variant="outline" className="ml-auto" onClick={() => handleEnd(assignment.id)}>
                    End
                  </Button>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(assignment.startDate).toLocaleDateString()}
                {assignment.endDate ? ` – ${new Date(assignment.endDate).toLocaleDateString()}` : " – ongoing"}
                {assignment.projectRole ? ` · ${assignment.projectRole.name}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {createOpen ? (
        <CreateAssignmentDialog
          employeeId={employeeId}
          onOpenChange={setCreateOpen}
          onCreated={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function CreateAssignmentDialog({
  employeeId,
  onOpenChange,
  onCreated,
}: {
  employeeId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { data } = useQuery<{ projects: ProjectOption[] }>({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("Failed to load projects.");
      return res.json();
    },
  });

  const [projectId, setProjectId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [allocationPercentage, setAllocationPercentage] = useState("100");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [isPrimary, setIsPrimary] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedProject = data?.projects.find((p) => p.id === projectId);

  async function handleSubmit() {
    if (!projectId) {
      toast.error("Select a project.");
      return;
    }
    setSubmitting(true);
    const result = await createAssignmentAction({
      employeeId,
      projectId,
      siteId: siteId || undefined,
      allocationPercentage: Number(allocationPercentage),
      startDate,
      isPrimary,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Assignment created.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New project assignment</DialogTitle>
          <DialogDescription>
            No projects yet? Create one first from HR Settings → Projects.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={(v) => { setProjectId(v ?? ""); setSiteId(""); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {(data?.projects ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedProject && selectedProject.sites.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Site (optional)</Label>
              <Select value={siteId} onValueChange={(v) => setSiteId(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProject.sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Allocation percentage</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={allocationPercentage}
              onChange={(e) => setAllocationPercentage(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPrimary} onCheckedChange={(v) => setIsPrimary(v === true)} />
            Primary assignment
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create assignment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
