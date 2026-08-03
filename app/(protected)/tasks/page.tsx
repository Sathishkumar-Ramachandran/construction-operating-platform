import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { getActorEmployeeId } from "@/lib/services/employee-service";
import { listTasksForEmployee } from "@/lib/services/task-service";
import { MyTasksList, type MyTaskView } from "@/app/(protected)/tasks/my-tasks-list";
import { ListChecks } from "lucide-react";

export default async function TasksPage() {
  return withTenantPermission(PERMISSIONS.PROJECTS_VIEW.code, async (user) => {
    const employeeId = await getActorEmployeeId(user.id);

    if (!employeeId) {
      return (
        <div className="space-y-6">
          <PageHeader title="My Tasks" description="Tasks assigned to you across your projects." />
          <EmptyState
            icon={ListChecks}
            title="No linked employee record"
            description="Your account isn't linked to an employee record, so no tasks can be assigned to you."
          />
        </div>
      );
    }

    const tasks = await listTasksForEmployee(employeeId);
    const tasksView: MyTaskView[] = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      project: task.project,
      site: task.site,
    }));

    return (
      <div className="space-y-6">
        <PageHeader title="My Tasks" description="Tasks assigned to you across your projects." />
        <MyTasksList tasks={tasksView} />
      </div>
    );
  });
}
