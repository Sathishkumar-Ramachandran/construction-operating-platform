import { NextRequest } from "next/server";
import { withTenantApiPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { listEmployeesQuerySchema } from "@/lib/validation/employees";
import { listEmployees, employeeDisplayName } from "@/lib/services/employee-service";
import { getWorkforceAvailabilityBatch } from "@/lib/services/employee-availability-service";

export async function GET(request: NextRequest) {
  return withTenantApiPermission(PERMISSIONS.HR_EMPLOYEE_VIEW.code, async (user) => {
    const parsed = listEmployeesQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return Response.json(
        { error: "VALIDATION_ERROR", message: "Invalid query parameters." },
        { status: 400 }
      );
    }

    const result = await listEmployees(user, parsed.data);
    const availabilityByEmployee = await getWorkforceAvailabilityBatch(
      result.employees.map((e) => e.id)
    );

    return Response.json({
      ...result,
      employees: result.employees.map((employee) => ({
        ...employee,
        displayName: employeeDisplayName(employee),
        workforceAvailability: availabilityByEmployee.get(employee.id) ?? "FREE",
      })),
    });
  });
}
