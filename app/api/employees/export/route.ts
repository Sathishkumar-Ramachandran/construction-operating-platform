import { NextRequest } from "next/server";
import { requireApiPermission } from "@/lib/auth/guards";
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

export async function GET(request: NextRequest) {
  const guard = await requireApiPermission(PERMISSIONS.HR_EMPLOYEE_EXPORT.code);
  if (guard.response) return guard.response;

  const parsed = listEmployeesQuerySchema.safeParse({
    ...Object.fromEntries(request.nextUrl.searchParams),
    page: 1,
    pageSize: 1000,
  });
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const result = await listEmployees(guard.user, parsed.data);

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
    userId: guard.user.id,
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
}
