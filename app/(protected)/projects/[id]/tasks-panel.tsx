"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { employeeDisplayName } from "@/lib/hr/employee-display";
import { createTaskAction, updateTaskStatusAction } from "@/actions/task-actions";
import { TASK_STATUS_LABELS, TaskStatus, type TaskStatus as TaskStatusType } from "@/lib/projects/constants";
import { cn } from "@/lib/utils";
import { ListChecks } from "lucide-react";
import type { AssignmentView, SiteView, TaskView } from "@/app/(protected)/projects/[id]/types";

const TASK_STATUS_STYLES: Record<string, string> = {
  TODO: "border-border text-muted-foreground",
  IN_PROGRESS: "border-primary/30 bg-primary/10 text-primary",
  DONE: "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive",
};

function TaskStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TASK_STATUS_STYLES[status] ?? "border-border text-muted-foreground")}>
      {TASK_STATUS_LABELS[status as TaskStatusType] ?? status}
    </Badge>
  );
}

export function TasksPanel({
  projectId,
  sites,
  assignments,
  tasks,
  actorEmployeeId,
  canManageTasks,
}: {
  projectId: string;
  sites: SiteView[];
  assignments: AssignmentView[];
  tasks: TaskView[];
  actorEmployeeId: string | null;
  canManageTasks: boolean;
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

  async function handleStatusChange(taskId: string, status: string) {
    const result = await updateTaskStatusAction({ id: taskId, status });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Task updated.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Tasks</h4>
        {canManageTasks ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            New task
          </Button>
        ) : null}
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No tasks"
          description={canManageTasks ? "Assign a task to a team member to see it here." : "You have no tasks on this project yet."}
        />
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isOwn = task.assignee.id === actorEmployeeId;
            return (
              <div key={task.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {employeeDisplayName(task.assignee)}
                      {task.site ? ` · ${task.site.name}` : ""}
                      {task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                  <TaskStatusBadge status={task.status} />
                </div>
                {task.description ? <p className="text-sm text-muted-foreground">{task.description}</p> : null}
                {isOwn && task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED ? (
                  <div className="flex gap-2">
                    {task.status === TaskStatus.TODO ? (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(task.id, TaskStatus.IN_PROGRESS)}>
                        Start
                      </Button>
                    ) : null}
                    <Button size="sm" onClick={() => handleStatusChange(task.id, TaskStatus.DONE)}>
                      Mark done
                    </Button>
                  </div>
                ) : null}
                {canManageTasks && task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED ? (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(task.id, TaskStatus.CANCELLED)}>
                    Cancel task
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {createOpen ? (
        <CreateTaskDialog
          projectId={projectId}
          sites={sites}
          members={projectMembers}
          onOpenChange={setCreateOpen}
          onCreated={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function CreateTaskDialog({
  projectId,
  sites,
  members,
  onOpenChange,
  onCreated,
}: {
  projectId: string;
  sites: SiteView[];
  members: AssignmentView["employee"][];
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToEmployeeId, setAssignedToEmployeeId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [dueDate, setDueDate] = useState("");
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
      dueDate: dueDate || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Task created.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New task</DialogTitle>
          <DialogDescription>Assign a task to a member of this project&apos;s team.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Assignee</Label>
            <Select
              value={assignedToEmployeeId}
              onValueChange={(v) => setAssignedToEmployeeId(v ?? "")}
              items={members.map((m) => ({ value: m.id, label: employeeDisplayName(m) }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a team member" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {employeeDisplayName(m)}
                  </SelectItem>
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No specific site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Due date (optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
