import { NextRequest } from "next/server";
import { withTenantApiPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { listLeaveRequestsQuerySchema } from "@/lib/validation/leave";
import { listLeaveRequestsForActor } from "@/lib/services/leave-service";

export async function GET(request: NextRequest) {
  return withTenantApiPermission(PERMISSIONS.HR_LEAVE_VIEW.code, async (user) => {
    const parsed = listLeaveRequestsQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    if (!parsed.success) {
      return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });
    }

    const result = await listLeaveRequestsForActor(user, parsed.data);
    return Response.json(result);
  });
}
