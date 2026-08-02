"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectOverviewPanel } from "@/app/(protected)/projects/[id]/project-overview-panel";
import { TeamPanel } from "@/app/(protected)/projects/[id]/team-panel";
import { PhasesPanel } from "@/app/(protected)/projects/[id]/phases-panel";
import { ResourceRequestsPanel } from "@/app/(protected)/projects/[id]/resource-requests-panel";
import { TasksPanel } from "@/app/(protected)/projects/[id]/tasks-panel";
import { WbsPanel } from "@/app/(protected)/projects/[id]/wbs-panel";
import { BudgetPanel } from "@/app/(protected)/projects/[id]/budget-panel";
import { ProgressClaimsPanel } from "@/app/(protected)/projects/[id]/progress-claims-panel";
import { DefectsPanel } from "@/app/(protected)/projects/[id]/defects-panel";
import { DocumentManagerPanel } from "@/components/shared/document-manager-panel";
import type { UserRole } from "@/lib/authorization/roles";
import type {
  AssignmentView,
  BudgetLineView,
  DefectItemView,
  DocumentView,
  ProgressClaimView,
  ProjectView,
  ResourceRequestView,
  SiteApprovalMap,
  SiteChecklistMap,
  TaskView,
  WbsTaskView,
} from "@/app/(protected)/projects/[id]/types";

export function ProjectWorkspaceTabs({
  project,
  assignments,
  resourceRequests,
  tasks,
  wbsTasks,
  budgetLines,
  progressClaims,
  defects,
  documents,
  siteApprovals,
  siteChecklists,
  actorUserId,
  actorRole,
  actorEmployeeId,
  canManageProject,
  canManageTeam,
  canRequestResources,
  canManageTasks,
  canManageBudget,
  canManageWbs,
  canManageClaims,
  canManageDefects,
  canManageDocuments,
  restricted,
}: {
  project: ProjectView;
  assignments: AssignmentView[];
  resourceRequests: ResourceRequestView[];
  tasks: TaskView[];
  wbsTasks: WbsTaskView[];
  budgetLines: BudgetLineView[];
  progressClaims: ProgressClaimView[];
  defects: DefectItemView[];
  documents: DocumentView[];
  siteApprovals: SiteApprovalMap;
  siteChecklists: SiteChecklistMap;
  actorUserId: string;
  actorRole: UserRole;
  actorEmployeeId: string | null;
  canManageProject: boolean;
  canManageTeam: boolean;
  canRequestResources: boolean;
  canManageTasks: boolean;
  canManageBudget: boolean;
  canManageWbs: boolean;
  canManageClaims: boolean;
  canManageDefects: boolean;
  canManageDocuments: boolean;
  restricted: boolean;
}) {
  return (
    <Tabs defaultValue={restricted ? "phases" : "overview"}>
      <div className="overflow-x-auto">
        <TabsList variant="line" className="w-max min-w-full">
          {restricted ? null : <TabsTrigger value="overview">Overview</TabsTrigger>}
          {restricted ? null : <TabsTrigger value="team">Team</TabsTrigger>}
          <TabsTrigger value="phases">Phases</TabsTrigger>
          {restricted ? null : <TabsTrigger value="wbs">WBS</TabsTrigger>}
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          {restricted ? null : <TabsTrigger value="resources">Inventory Requests</TabsTrigger>}
          {restricted ? null : <TabsTrigger value="budget">Budget</TabsTrigger>}
          {restricted ? null : <TabsTrigger value="claims">Progress Claims</TabsTrigger>}
          {restricted ? null : <TabsTrigger value="defects">Defects</TabsTrigger>}
          {restricted ? null : <TabsTrigger value="documents">Documents</TabsTrigger>}
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
        <TabsContent value="wbs" className="space-y-4">
          <WbsPanel
            projectId={project.id}
            sites={project.sites}
            assignments={assignments}
            tasks={wbsTasks}
            actorEmployeeId={actorEmployeeId}
            canManageWbs={canManageWbs}
          />
        </TabsContent>
      )}

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

      {restricted ? null : (
        <TabsContent value="budget" className="space-y-4">
          <BudgetPanel projectId={project.id} budgetLines={budgetLines} canManageBudget={canManageBudget} />
        </TabsContent>
      )}

      {restricted ? null : (
        <TabsContent value="claims" className="space-y-4">
          <ProgressClaimsPanel projectId={project.id} claims={progressClaims} canManageClaims={canManageClaims} />
        </TabsContent>
      )}

      {restricted ? null : (
        <TabsContent value="defects" className="space-y-4">
          <DefectsPanel projectId={project.id} sites={project.sites} defects={defects} canManageDefects={canManageDefects} />
        </TabsContent>
      )}

      {restricted ? null : (
        <TabsContent value="documents" className="space-y-4">
          <DocumentManagerPanel scope={{ projectId: project.id }} documents={documents} canUpload={canManageDocuments} />
        </TabsContent>
      )}
    </Tabs>
  );
}
