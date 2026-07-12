import { NextRequest } from "next/server";
import { requireApiPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { listAvailabilityQuerySchema } from "@/lib/validation/allocation";
import { listEmployees } from "@/lib/services/employee-service";
import { employeeDisplayName } from "@/lib/hr/employee-display";
import { getWorkforceAvailabilityBatch } from "@/lib/services/employee-availability-service";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermission(PERMISSIONS.HR_ALLOCATION_VIEW.code);
  if (guard.response) return guard.response;

  const parsed = listAvailabilityQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  // Availability is derived (not a DB column), so filtering/pagination
  // happens in-memory over the department/designation-scoped result set —
  // acceptable at this phase's expected headcount; documented as a future
  // optimization if the workforce grows large.
  const { employees } = await listEmployees(guard.user, {
    search: parsed.data.search,
    departmentId: parsed.data.departmentId,
    designationId: parsed.data.designationId,
    page: 1,
    pageSize: 1000,
  });

  const availabilityByEmployee = await getWorkforceAvailabilityBatch(
    employees.map((e) => e.id)
  );

  let enriched = employees.map((employee) => ({
    ...employee,
    displayName: employeeDisplayName(employee),
    workforceAvailability: availabilityByEmployee.get(employee.id) ?? "FREE",
  }));

  if (parsed.data.status) {
    enriched = enriched.filter((e) => e.workforceAvailability === parsed.data.status);
  }

  const total = enriched.length;
  const start = (parsed.data.page - 1) * parsed.data.pageSize;
  const page = enriched.slice(start, start + parsed.data.pageSize);

  return Response.json({ employees: page, total, page: parsed.data.page, pageSize: parsed.data.pageSize });
}
