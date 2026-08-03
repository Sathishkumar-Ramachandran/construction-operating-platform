import { NextRequest } from "next/server";
import { withTenantApiPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { attendanceBoardQuerySchema } from "@/lib/validation/attendance";
import { getAttendanceBoardForDate } from "@/lib/services/attendance-service";

export async function GET(request: NextRequest) {
  return withTenantApiPermission(PERMISSIONS.HR_ATTENDANCE_VIEW.code, async (user) => {
    const parsed = attendanceBoardQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { employees, holidayName } = await getAttendanceBoardForDate(
      user,
      parsed.data.date,
      {
        search: parsed.data.search,
        departmentId: parsed.data.departmentId,
        status: parsed.data.status,
      }
    );

    const total = employees.length;
    const start = (parsed.data.page - 1) * parsed.data.pageSize;
    const page = employees.slice(start, start + parsed.data.pageSize);

    return Response.json({
      employees: page,
      total,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      holidayName,
    });
  });
}
