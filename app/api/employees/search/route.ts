import { NextRequest } from "next/server";
import { withTenantApiPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { db } from "@/lib/db";
import { employeeDisplayName } from "@/lib/services/employee-service";

const RESULT_LIMIT = 20;

/**
 * Lightweight typeahead for employee-picker comboboxes (reporting manager,
 * department manager, etc.) — intentionally separate from GET /api/employees
 * (which is paginated/filtered for the directory table, not a live search).
 */
export async function GET(request: NextRequest) {
  return withTenantApiPermission(PERMISSIONS.HR_EMPLOYEE_VIEW.code, async () => {
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const excludeId = request.nextUrl.searchParams.get("excludeId") ?? undefined;

    const employees = await db.employee.findMany({
      where: {
        ...(excludeId ? { id: { not: excludeId } } : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { preferredName: { contains: q, mode: "insensitive" } },
                { employeeNumber: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        employeeNumber: true,
        firstName: true,
        middleName: true,
        lastName: true,
        preferredName: true,
        designation: { select: { name: true } },
      },
      orderBy: { firstName: "asc" },
      take: RESULT_LIMIT,
    });

    return Response.json({
      items: employees.map((e) => ({
        id: e.id,
        label: `${employeeDisplayName(e)} (${e.employeeNumber})${e.designation ? ` — ${e.designation.name}` : ""}`,
      })),
    });
  });
}
