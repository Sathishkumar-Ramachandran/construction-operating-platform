import { requireApiPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { ProjectStatus } from "@/lib/projects/constants";
import { listProjects } from "@/lib/services/project-service";

export async function GET() {
  const guard = await requireApiPermission(PERMISSIONS.HR_ALLOCATION_VIEW.code);
  if (guard.response) return guard.response;

  const { projects } = await listProjects({ status: ProjectStatus.ACTIVE });
  return Response.json({ projects });
}
