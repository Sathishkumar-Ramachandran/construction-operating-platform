import { Settings } from "lucide-react";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function SettingsPage() {
  return withTenantPermission(PERMISSIONS.SETTINGS_VIEW.code, async () => {
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
  });
}
