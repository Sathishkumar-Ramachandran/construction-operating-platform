import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import { hasPermission } from "@/lib/services/authorization-service";
import { isAppError } from "@/lib/errors";
import { PageHeader } from "@/components/shared/page-header";
import { getProjectById, assertActorCanAccessProject } from "@/lib/services/project-service";
import { listAssignmentsForProject } from "@/lib/services/employee-allocation-service";
import { listResourceRequestsForProject } from "@/lib/services/project-resource-request-service";
import { listTasksForProject } from "@/lib/services/task-service";
import { getApprovalHistoryForEntity } from "@/lib/services/approval-service";
import { getActorEmployeeId } from "@/lib/services/employee-service";
import { getChecklistForSite } from "@/lib/services/site-stage-checklist-service";
import { ProjectStatusBadge } from "@/app/(protected)/projects/project-status-badge";
import { ProjectWorkspaceTabs } from "@/app/(protected)/projects/[id]/project-workspace-tabs";
import type { ProjectStatus, SiteStage } from "@/lib/projects/constants";
import type {
  AssignmentView,
  ProjectView,
  ResourceRequestView,
  SiteApprovalMap,
  SiteChecklistMap,
  TaskView,
} from "@/app/(protected)/projects/[id]/types";

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireUser();

  let project;
  try {
    project = await getProjectById(id);
    await assertActorCanAccessProject(actor, project.id);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  // Team Members get a stripped-down workspace: no budget/client/address,
  // no Team or Inventory Requests tabs, Phases/Tasks scoped to their own
  // site/tasks only — "no confidential information" per product decision.
  const restricted = actor.role === UserRole.TEAM_MEMBER;
  const actorEmployeeId = await getActorEmployeeId(actor.id);

  const [
    canManageProject,
    canManageTeamViaAllocation,
    canManageTeamDirect,
    canRequestResources,
    canManageTasks,
    assignments,
    resourceRequests,
    tasks,
  ] = await Promise.all([
    hasPermission(actor, PERMISSIONS.PROJECTS_MANAGE.code),
    hasPermission(actor, PERMISSIONS.HR_ALLOCATION_MANAGE.code),
    hasPermission(actor, PERMISSIONS.PROJECTS_TEAM_MANAGE.code),
    hasPermission(actor, PERMISSIONS.PROJECTS_RESOURCE_REQUEST_MANAGE.code),
    hasPermission(actor, PERMISSIONS.PROJECTS_TASK_MANAGE.code),
    listAssignmentsForProject(project.id),
    listResourceRequestsForProject(project.id),
    listTasksForProject(project.id, restricted ? { assignedToEmployeeId: actorEmployeeId ?? "__none__" } : {}),
  ]);

  const canManageTeam = canManageTeamViaAllocation || canManageTeamDirect;

  // Only sites that have ever submitted a handover request carry a
  // handoverApprovalRequestId — skip the approval-history query otherwise.
  const siteHandoverEntries = await Promise.all(
    project.sites.map(async (site) => {
      if (!site.handoverApprovalRequestId) return [site.id, null] as const;
      const history = await getApprovalHistoryForEntity("PROJECT_STAGE_GATE", "Site", site.id);
      const latest = history[0] ?? null;
      if (!latest) return [site.id, null] as const;
      return [
        site.id,
        {
          id: latest.id,
          status: latest.status,
          reason: latest.reason,
          decisionNotes: latest.steps.find((step) => step.status === "REJECTED")?.decisionNotes ?? null,
        },
      ] as const;
    })
  );
  const siteApprovals: SiteApprovalMap = Object.fromEntries(siteHandoverEntries);

  // Only the current stage's checklist is ever shown (the stepper only lets
  // the current row expand), so this is a small, bounded fetch.
  const siteChecklistEntries = await Promise.all(
    project.sites.map(async (site) => [site.id, await getChecklistForSite(site.id, site.currentStage as SiteStage)] as const)
  );
  const siteChecklists: SiteChecklistMap = Object.fromEntries(siteChecklistEntries);

  // When restricted, these fields are stripped server-side — not just hidden
  // in the UI — since any prop passed to a client component ships to the
  // browser in the RSC payload regardless of whether it's rendered.
  const projectView: ProjectView = {
    id: project.id,
    code: project.code,
    name: project.name,
    clientName: restricted ? null : project.clientName,
    description: restricted ? null : project.description,
    address: restricted ? null : project.address,
    estimatedBudget: restricted ? null : project.estimatedBudget != null ? Number(project.estimatedBudget) : null,
    status: project.status as ProjectStatus,
    startDate: project.startDate ? project.startDate.toISOString() : null,
    endDate: project.endDate ? project.endDate.toISOString() : null,
    createdAt: project.createdAt.toISOString(),
    sites: project.sites.map((site) => ({
      id: site.id,
      code: site.code,
      name: site.name,
      isActive: site.isActive,
      currentStage: site.currentStage as SiteStage,
      currentStageStartedAt: site.currentStageStartedAt.toISOString(),
      handoverApprovalRequestId: site.handoverApprovalRequestId,
    })),
  };

  // A restricted actor only needs their own assignment rows (PhasesPanel's
  // visible-sites filter checks equality against actorEmployeeId) — the rest
  // of the team's names/roles/allocations never need to leave the server.
  const assignmentsView: AssignmentView[] = assignments
    .filter((assignment) => !restricted || assignment.employee.id === actorEmployeeId)
    .map((assignment) => ({
      id: assignment.id,
      employee: assignment.employee,
      site: assignment.site,
      projectRole: assignment.projectRole,
      allocationPercentage: assignment.allocationPercentage,
      startDate: assignment.startDate.toISOString(),
      endDate: assignment.endDate ? assignment.endDate.toISOString() : null,
      isPrimary: assignment.isPrimary,
      status: assignment.status,
      notes: assignment.notes,
    }));

  // Resource requests (procurement) are never shown to a restricted actor —
  // the Inventory Requests tab doesn't exist for them — so don't ship the
  // data at all.
  const resourceRequestsView: ResourceRequestView[] = restricted
    ? []
    : resourceRequests.map((request) => ({
        id: request.id,
        site: request.site,
        itemDescription: request.itemDescription,
        quantity: Number(request.quantity),
        unit: request.unit,
        neededByDate: request.neededByDate ? request.neededByDate.toISOString() : null,
        notes: request.notes,
        status: request.status,
        requestedByUserId: request.requestedByUserId,
        createdAt: request.createdAt.toISOString(),
      }));

  const tasksView: TaskView[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    assignee: task.assignee,
    site: task.site,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={project.name}
        description={restricted ? project.code : `${project.code}${project.clientName ? " · " + project.clientName : ""}`}
        actions={<ProjectStatusBadge status={projectView.status} />}
      />
      <ProjectWorkspaceTabs
        project={projectView}
        assignments={assignmentsView}
        resourceRequests={resourceRequestsView}
        tasks={tasksView}
        siteApprovals={siteApprovals}
        siteChecklists={siteChecklists}
        actorUserId={actor.id}
        actorRole={actor.role}
        actorEmployeeId={actorEmployeeId}
        canManageProject={canManageProject}
        canManageTeam={canManageTeam}
        canRequestResources={canRequestResources}
        canManageTasks={canManageTasks}
        restricted={restricted}
      />
    </div>
  );
}
