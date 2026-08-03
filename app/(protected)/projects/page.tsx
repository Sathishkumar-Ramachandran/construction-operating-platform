import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import { hasPermission } from "@/lib/services/authorization-service";
import { PageHeader } from "@/components/shared/page-header";
import { listProjects } from "@/lib/services/project-service";
import { getActorEmployeeId } from "@/lib/services/employee-service";
import { ProjectsList, type ProjectCardView } from "@/app/(protected)/projects/projects-list";
import { CreateProjectDialog } from "@/app/(protected)/projects/create-project-dialog";
import type { ProjectStatus } from "@/lib/projects/constants";

export default async function ProjectsPage() {
  return withTenantPermission(PERMISSIONS.PROJECTS_VIEW.code, async (user) => {
    const canManage = await hasPermission(user, PERMISSIONS.PROJECTS_MANAGE.code);

    // Managers and Team Members only see projects they're actively assigned
    // to — Admin/Super Admin see everything. HR holds no PROJECTS_VIEW grant
    // by default, so it never reaches this list at all (see
    // assertActorCanAccessProject in project-service.ts for the matching
    // per-project boundary). Reuses the same scoping computed in [id]/page.tsx.
    const isScopedRole = user.role === UserRole.MANAGER || user.role === UserRole.TEAM_MEMBER;
    const actorEmployeeId = isScopedRole ? await getActorEmployeeId(user.id) : null;
    const { projects } =
      isScopedRole && !actorEmployeeId
        ? { projects: [] }
        : await listProjects(isScopedRole ? { assignedEmployeeId: actorEmployeeId! } : {});

    const projectsView: ProjectCardView[] = projects.map((project) => ({
      id: project.id,
      code: project.code,
      name: project.name,
      clientName: project.clientName,
      status: project.status as ProjectStatus,
      siteCount: project.sites.length,
      startDate: project.startDate ? project.startDate.toISOString() : null,
      endDate: project.endDate ? project.endDate.toISOString() : null,
    }));

    return (
      <div className="space-y-6">
        <PageHeader
          title="Projects"
          description="Plan, track, and report on active construction projects."
          actions={canManage ? <CreateProjectDialog /> : null}
        />
        <ProjectsList projects={projectsView} />
      </div>
    );
  });
}
