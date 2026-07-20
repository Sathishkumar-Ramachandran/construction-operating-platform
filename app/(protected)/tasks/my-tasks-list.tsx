"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { updateTaskStatusAction } from "@/actions/task-actions";
import { TASK_STATUS_LABELS, TaskStatus, type TaskStatus as TaskStatusType } from "@/lib/projects/constants";
import { cn } from "@/lib/utils";

export type MyTaskView = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  project: { id: string; code: string; name: string };
  site: { id: string; code: string; name: string } | null;
};

const TASK_STATUS_STYLES: Record<string, string> = {
  TODO: "border-border text-muted-foreground",
  IN_PROGRESS: "border-primary/30 bg-primary/10 text-primary",
  DONE: "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function MyTasksList({ tasks }: { tasks: MyTaskView[] }) {
  const router = useRouter();

  async function handleStatusChange(taskId: string, status: string) {
    const result = await updateTaskStatusAction({ id: taskId, status });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Task updated.");
    router.refresh();
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No tasks assigned"
        description="Tasks assigned to you across your projects will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div key={task.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                <Link href={`/projects/${task.project.id}`} className="hover:underline">
                  {task.project.name}
                </Link>
                {task.site ? ` · ${task.site.name}` : ""}
                {task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString()}` : ""}
              </p>
            </div>
            <Badge variant="outline" className={cn("font-medium", TASK_STATUS_STYLES[task.status] ?? "border-border text-muted-foreground")}>
              {TASK_STATUS_LABELS[task.status as TaskStatusType] ?? task.status}
            </Badge>
          </div>
          {task.description ? <p className="text-sm text-muted-foreground">{task.description}</p> : null}
          {task.status !== TaskStatus.DONE && task.status !== TaskStatus.CANCELLED ? (
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
        </div>
      ))}
    </div>
  );
}
