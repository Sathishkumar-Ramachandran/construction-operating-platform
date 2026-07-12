import { FolderKanban } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function ProjectsPage() {
  await requirePermission(PERMISSIONS.PROJECTS_VIEW.code);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Project lifecycle management is not built yet."
      />
      <EmptyState
        icon={FolderKanban}
        title="Project management is coming soon"
        description="This module will let you plan, track, and report on active construction projects."
      />
    </div>
  );
}
