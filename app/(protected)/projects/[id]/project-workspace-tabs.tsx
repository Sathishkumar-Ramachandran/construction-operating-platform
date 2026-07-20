"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectOverviewPanel } from "@/app/(protected)/projects/[id]/project-overview-panel";
import { TeamPanel } from "@/app/(protected)/projects/[id]/team-panel";
import { PhasesPanel } from "@/app/(protected)/projects/[id]/phases-panel";
import { ResourceRequestsPanel } from "@/app/(protected)/projects/[id]/resource-requests-panel";
import { TasksPanel } from "@/app/(protected)/projects/[id]/tasks-panel";
import type { UserRole } from "@/lib/authorization/roles";
import type {
  AssignmentView,
  ProjectView,
  ResourceRequestView,
  SiteApprovalMap,
  SiteChecklistMap,
  TaskView,
} from "@/app/(protected)/projects/[id]/types";

export function ProjectWorkspaceTabs({
  project,
  assignments,
  resourceRequests,
  tasks,
  siteApprovals,
  siteChecklists,
  actorUserId,
  actorRole,
  actorEmployeeId,
  canManageProject,
  canManageTeam,
  canRequestResources,
  canManageTasks,
  restricted,
}: {
  project: ProjectView;
  assignments: AssignmentView[];
  resourceRequests: ResourceRequestView[];
  tasks: TaskView[];
  siteApprovals: SiteApprovalMap;
  siteChecklists: SiteChecklistMap;
  actorUserId: string;
  actorRole: UserRole;
  actorEmployeeId: string | null;
  canManageProject: boolean;
  canManageTeam: boolean;
  canRequestResources: boolean;
  canManageTasks: boolean;
  restricted: boolean;
}) {
  return (
    <Tabs defaultValue={restricted ? "phases" : "overview"}>
      <div className="overflow-x-auto">
        <TabsList variant="line" className="w-max min-w-full">
          {restricted ? null : <TabsTrigger value="overview">Overview</TabsTrigger>}
          {restricted ? null : <TabsTrigger value="team">Team</TabsTrigger>}
          <TabsTrigger value="phases">Phases</TabsTrigger>
          {restricted ? null : <TabsTrigger value="resources">Inventory Requests</TabsTrigger>}
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
      </div>

      {restricted ? null : (
        <TabsContent value="overview" className="space-y-4">
          <ProjectOverviewPanel project={project} canManageProject={canManageProject} />
        </TabsContent>
      )}

      {restricted ? null : (
        <TabsContent value="team" className="space-y-4">
          <TeamPanel
            projectId={project.id}
            sites={project.sites}
            assignments={assignments}
            canManageTeam={canManageTeam}
          />
        </TabsContent>
      )}

      <TabsContent value="phases" className="space-y-4">
        <PhasesPanel
          projectStatus={project.status}
          sites={project.sites}
          siteApprovals={siteApprovals}
          siteChecklists={siteChecklists}
          assignments={assignments}
          actorRole={actorRole}
          actorEmployeeId={actorEmployeeId}
          restricted={restricted}
        />
      </TabsContent>

      {restricted ? null : (
        <TabsContent value="resources" className="space-y-4">
          <ResourceRequestsPanel
            projectId={project.id}
            sites={project.sites}
            resourceRequests={resourceRequests}
            actorUserId={actorUserId}
            canRequestResources={canRequestResources}
          />
        </TabsContent>
      )}

      <TabsContent value="tasks" className="space-y-4">
        <TasksPanel
          projectId={project.id}
          sites={project.sites}
          assignments={assignments}
          tasks={tasks}
          actorEmployeeId={actorEmployeeId}
          canManageTasks={canManageTasks}
        />
      </TabsContent>
    </Tabs>
  );
}
