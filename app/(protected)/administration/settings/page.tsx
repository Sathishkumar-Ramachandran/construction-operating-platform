import { Settings } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function SettingsPage() {
  await requirePermission(PERMISSIONS.SETTINGS_VIEW.code);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company Settings"
        description="Company-wide configuration is not built yet."
      />
      <EmptyState
        icon={Settings}
        title="Configuration is coming soon"
        description="Company profile, branding, and platform-wide settings will appear here."
      />
    </div>
  );
}
