import { notFound } from "next/navigation";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { isAppError } from "@/lib/errors";
import { PageHeader } from "@/components/shared/page-header";
import { getEmployeeById } from "@/lib/services/employee-service";
import { EmployeeForm } from "@/app/(protected)/employees/employee-form";
import type { CreateEmployeeInput } from "@/lib/validation/employees";

function toDateInput(value: Date | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return withTenantPermission(PERMISSIONS.HR_EMPLOYEE_UPDATE.code, async (actor) => {
    let result;
    try {
      result = await getEmployeeById(actor, id);
    } catch (error) {
      if (isAppError(error)) notFound();
      throw error;
    }

    const { employee } = result;

    const initialData: Partial<CreateEmployeeInput> = {
      firstName: employee.firstName,
      middleName: employee.middleName ?? "",
      lastName: employee.lastName ?? "",
      preferredName: employee.preferredName ?? "",
      dateOfBirth: "dateOfBirth" in employee ? toDateInput(employee.dateOfBirth) : "",
      gender: "gender" in employee ? (employee.gender ?? "") : "",
      nationalityCode: "nationalityCode" in employee ? (employee.nationalityCode ?? "") : "",
      maritalStatus: "maritalStatus" in employee ? (employee.maritalStatus ?? "") : "",
      personalEmail: "personalEmail" in employee ? (employee.personalEmail ?? "") : "",
      workEmail: "workEmail" in employee ? (employee.workEmail ?? "") : "",
      mobileNumber: employee.mobileNumber ?? "",
      alternateMobileNumber: employee.alternateMobileNumber ?? "",
      joiningDate: toDateInput(employee.joiningDate),
      departmentId: employee.department?.id ?? "",
      designationId: employee.designation?.id ?? "",
      gradeId: employee.grade?.id ?? "",
      employmentTypeId: employee.employmentType?.id ?? "",
      reportingManagerId: employee.reportingManager?.id ?? "",
      defaultShiftTypeId: "defaultShift" in employee ? (employee.defaultShift?.id ?? "") : "",
      workLocation: (employee.workLocation as "OFFICE" | "SITE" | null) ?? "",
    };

    return (
      <div className="space-y-6">
        <PageHeader title="Edit employee" description={employee.employeeNumber} />
        <div className="max-w-3xl">
          <EmployeeForm mode="edit" employeeId={employee.id} version={employee.version ?? 0} initialData={initialData} />
        </div>
      </div>
    );
  });
}
