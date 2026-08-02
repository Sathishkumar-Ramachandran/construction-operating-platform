"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ListTree } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { employeeDisplayName } from "@/lib/hr/employee-display";
import { createTaskAction, updateTaskProgressAction } from "@/actions/task-actions";
import { cn } from "@/lib/utils";
import type { AssignmentView, SiteView, WbsTaskView } from "@/app/(protected)/projects/[id]/types";

type TreeNode = WbsTaskView & { depth: number };

function buildTree(tasks: WbsTaskView[]): TreeNode[] {
  const byParent = new Map<string | null, WbsTaskView[]>();
  for (const task of tasks) {
    const key = task.parentTaskId;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(task);
  }

  const result: TreeNode[] = [];
  const visited = new Set<string>();

  function visit(parentId: string | null, depth: number) {
    const children = byParent.get(parentId) ?? [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      result.push({ ...child, depth });
      visit(child.id, depth + 1);
    }
  }

  visit(null, 0);
  // Any task whose parent was never seen (e.g. cross-project data issues) —
  // still show it, flat, rather than silently dropping it.
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      visited.add(task.id);
      result.push({ ...task, depth: 0 });
    }
  }
  return result;
}

export function WbsPanel({
  projectId,
  sites,
  assignments,
  tasks,
  actorEmployeeId,
  canManageWbs,
}: {
  projectId: string;
  sites: SiteView[];
  assignments: AssignmentView[];
  tasks: WbsTaskView[];
  actorEmployeeId: string | null;
  canManageWbs: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  const projectMembers = useMemo(() => {
    const seen = new Map<string, AssignmentView["employee"]>();
    for (const assignment of assignments) {
      if (assignment.status === "ACTIVE") seen.set(assignment.employee.id, assignment.employee);
    }
    return Array.from(seen.values());
  }, [assignments]);

  const tree = useMemo(() => buildTree(tasks), [tasks]);

  async function handleProgressChange(taskId: string, percentComplete: number) {
    const result = await updateTaskProgressAction({ id: taskId, percentComplete });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Work Breakdown Structure</h4>
        {canManageWbs ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            New WBS item
          </Button>
        ) : null}
      </div>

      {tree.length === 0 ? (
        <EmptyState icon={ListTree} title="No WBS items yet" description="Break the project down into planned, trackable work items." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">WBS</th>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Assignee</th>
                <th className="px-3 py-2 font-medium">Planned</th>
                <th className="px-3 py-2 font-medium">Progress</th>
              </tr>
            </thead>
            <tbody>
              {tree.map((node) => {
                const canEditProgress = canManageWbs || node.assignee.id === actorEmployeeId;
                return (
                  <tr key={node.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">{node.wbsCode ?? "—"}</td>
                    <td className="px-3 py-2" style={{ paddingLeft: `${12 + node.depth * 20}px` }}>
                      <p className="font-medium text-foreground">{node.title}</p>
                      {node.site ? <p className="text-xs text-muted-foreground">{node.site.name}</p> : null}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{employeeDisplayName(node.assignee)}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {node.plannedStartDate ? new Date(node.plannedStartDate).toLocaleDateString() : "—"}
                      {" – "}
                      {node.plannedEndDate ? new Date(node.plannedEndDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-muted">
                          <div
                            className={cn("h-1.5 rounded-full bg-primary", node.percentComplete >= 100 && "bg-gold")}
                            style={{ width: `${node.percentComplete}%` }}
                          />
                        </div>
                        {canEditProgress ? (
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            defaultValue={node.percentComplete}
                            className="h-7 w-16"
                            onBlur={(e) => {
                              const value = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                              if (value !== node.percentComplete) handleProgressChange(node.id, value);
                            }}
                          />
                        ) : (
                          <span className="text-xs text-muted-foreground">{node.percentComplete}%</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {createOpen ? (
        <CreateWbsItemDialog
          projectId={projectId}
          sites={sites}
          members={projectMembers}
          parentOptions={tasks}
          onOpenChange={setCreateOpen}
          onCreated={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function CreateWbsItemDialog({
  projectId,
  sites,
  members,
  parentOptions,
  onOpenChange,
  onCreated,
}: {
  projectId: string;
  sites: SiteView[];
  members: AssignmentView["employee"][];
  parentOptions: WbsTaskView[];
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [wbsCode, setWbsCode] = useState("");
  const [parentTaskId, setParentTaskId] = useState("");
  const [assignedToEmployeeId, setAssignedToEmployeeId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!title || !assignedToEmployeeId) {
      toast.error("Title and assignee are required.");
      return;
    }
    setSubmitting(true);
    const result = await createTaskAction({
      projectId,
      siteId: siteId || undefined,
      title,
      description,
      assignedToEmployeeId,
      wbsCode: wbsCode || undefined,
      parentTaskId: parentTaskId || undefined,
      plannedStartDate: plannedStartDate || undefined,
      plannedEndDate: plannedEndDate || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("WBS item created.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New WBS item</DialogTitle>
          <DialogDescription>A planned, trackable unit of work — optionally nested under a parent item.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>WBS code (optional)</Label>
              <Input placeholder="e.g. 1.2" value={wbsCode} onChange={(e) => setWbsCode(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Parent item (optional)</Label>
              <Select
                value={parentTaskId}
                onValueChange={(v) => setParentTaskId(v ?? "")}
                items={parentOptions.map((t) => ({ value: t.id, label: t.wbsCode ? `${t.wbsCode} ${t.title}` : t.title }))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {parentOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.wbsCode ? `${t.wbsCode} ${t.title}` : t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select
              value={assignedToEmployeeId}
              onValueChange={(v) => setAssignedToEmployeeId(v ?? "")}
              items={members.map((m) => ({ value: m.id, label: employeeDisplayName(m) }))}
            >
              <SelectTrigger className="w-full"><SelectValue placeholder="Select a team member" /></SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{employeeDisplayName(m)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {sites.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Site (optional)</Label>
              <Select
                value={siteId}
                onValueChange={(v) => setSiteId(v ?? "")}
                items={sites.map((site) => ({ value: site.id, label: site.name }))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="No specific site" /></SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Planned start</Label>
              <Input type="date" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Planned end</Label>
              <Input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
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
