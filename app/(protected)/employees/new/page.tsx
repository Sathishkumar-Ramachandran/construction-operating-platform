import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmployeeForm } from "@/app/(protected)/employees/employee-form";

export default async function NewEmployeePage() {
  return withTenantPermission(PERMISSIONS.HR_EMPLOYEE_CREATE.code, async () => {
    return (
      <div className="space-y-6">
        <PageHeader
          title="New employee"
          description="Create a new employee record. An employee number is assigned automatically."
        />
        <div className="max-w-3xl">
          <EmployeeForm mode="create" />
        </div>
      </div>
    );
  });
}
