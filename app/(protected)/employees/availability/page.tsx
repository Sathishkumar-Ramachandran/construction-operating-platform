import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { AvailabilityBoard } from "@/app/(protected)/employees/availability/availability-board";

export default async function EmployeeAvailabilityPage() {
  await requirePermission(PERMISSIONS.HR_ALLOCATION_VIEW.code);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employee availability"
        description="See who is free, in a project, or partially allocated right now."
      />
      <AvailabilityBoard />
    </div>
  );
}
