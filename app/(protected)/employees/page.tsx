import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { hasPermission } from "@/lib/services/authorization-service";
import { PageHeader } from "@/components/shared/page-header";
import { EmployeeDirectory } from "@/app/(protected)/employees/employee-directory";

export default async function EmployeesPage() {
  return withTenantPermission(PERMISSIONS.HR_EMPLOYEE_VIEW.code, async (actor) => {
    const [canCreate, canExport] = await Promise.all([
      hasPermission(actor, PERMISSIONS.HR_EMPLOYEE_CREATE.code),
      hasPermission(actor, PERMISSIONS.HR_EMPLOYEE_EXPORT.code),
    ]);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Employees"
          description="Search, filter, and manage the employee directory."
        />
        <EmployeeDirectory canCreate={canCreate} canExport={canExport} />
      </div>
    );
  });
}
