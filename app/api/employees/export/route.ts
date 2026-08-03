import { NextRequest } from "next/server";
import { withTenantApiPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { listEmployeesQuerySchema } from "@/lib/validation/employees";
import { listEmployees, employeeDisplayName } from "@/lib/services/employee-service";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { db } from "@/lib/db";
import { EMPLOYMENT_STATUS_LABELS, type EmploymentStatus } from "@/lib/hr/constants";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// The paginated list schema caps pageSize at 100 for the on-screen table;
// export needs every matching row in one CSV, so filters are validated
// against that schema but page/pageSize are supplied separately here,
// uncapped, rather than reusing the UI's pagination limit.
const exportFiltersSchema = listEmployeesQuerySchema.omit({ page: true, pageSize: true });

export async function GET(request: NextRequest) {
  return withTenantApiPermission(PERMISSIONS.HR_EMPLOYEE_EXPORT.code, async (user) => {
    const parsed = exportFiltersSchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }

    const result = await listEmployees(user, { ...parsed.data, page: 1, pageSize: 1000 });

    const header = [
      "Employee Number",
      "Name",
      "Designation",
      "Department",
      "Employment Status",
      "Joining Date",
    ];
    const rows = result.employees.map((employee) => [
      employee.employeeNumber,
      employeeDisplayName(employee),
      employee.designation?.name ?? "",
      employee.department?.name ?? "",
      EMPLOYMENT_STATUS_LABELS[employee.employmentStatus as EmploymentStatus] ?? employee.employmentStatus,
      employee.joiningDate.toISOString().slice(0, 10),
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");

    await recordAuditLog(db, {
      userId: user.id,
      action: AuditAction.EMPLOYEE_DIRECTORY_EXPORTED,
      entityType: "Employee",
      metadata: { count: result.employees.length },
    });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="employee-directory-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  });
}
