import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { AvailabilityBoard } from "@/app/(protected)/employees/availability/availability-board";

export default async function EmployeeAvailabilityPage() {
  return withTenantPermission(PERMISSIONS.HR_ALLOCATION_VIEW.code, async () => {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Employee availability"
          description="See who is free, in a project, or partially allocated right now."
        />
        <AvailabilityBoard />
      </div>
    );
  });
}
