import { withTenantApiPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { ProjectStatus } from "@/lib/projects/constants";
import { listProjects } from "@/lib/services/project-service";

export async function GET() {
  return withTenantApiPermission(PERMISSIONS.HR_ALLOCATION_VIEW.code, async () => {
    const { projects } = await listProjects({ status: ProjectStatus.ACTIVE });
    return Response.json({ projects });
  });
}
