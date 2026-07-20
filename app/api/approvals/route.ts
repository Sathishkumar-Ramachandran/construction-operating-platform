import { NextRequest } from "next/server";
import { requireApiPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { listApprovalsQuerySchema } from "@/lib/validation/approvals";
import { listApprovalsForActor } from "@/lib/services/approval-service";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermission(PERMISSIONS.APPROVALS_VIEW.code);
  if (guard.response) return guard.response;

  const parsed = listApprovalsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return Response.json({ error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const result = await listApprovalsForActor(guard.user, parsed.data);
  return Response.json(result);
}
