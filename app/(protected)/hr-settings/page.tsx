import { redirect } from "next/navigation";
import { withTenantUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/services/authorization-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { HrSettingsTabs } from "@/app/(protected)/hr-settings/hr-settings-tabs";

export default async function HrSettingsPage() {
  return withTenantUser(async (actor) => {
    const [canManageMasterData, canManageAllocation] = await Promise.all([
      hasPermission(actor, PERMISSIONS.HR_MASTER_DATA_MANAGE.code),
      hasPermission(actor, PERMISSIONS.HR_ALLOCATION_MANAGE.code),
    ]);

    if (!canManageMasterData && !canManageAllocation) {
      redirect("/unauthorized");
    }

    return (
      <div className="space-y-6">
        <PageHeader
          title="HR Settings"
          description="Configurable organizational data — departments, designations, and the rest of the HR foundation. Nothing here is hard-coded in application logic."
        />
        <HrSettingsTabs canManageMasterData={canManageMasterData} canManageAllocation={canManageAllocation} />
      </div>
    );
  });
}
