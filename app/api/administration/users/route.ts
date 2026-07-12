import { NextRequest } from "next/server";
import { requireApiPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { listUsersQuerySchema } from "@/lib/validation/users";
import { listUsers } from "@/lib/services/user-service";

export async function GET(request: NextRequest) {
  const guard = await requireApiPermission(PERMISSIONS.USERS_VIEW.code);
  if (guard.response) return guard.response;

  const parsed = listUsersQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsed.success) {
    return Response.json(
      { error: "VALIDATION_ERROR", message: "Invalid query parameters." },
      { status: 400 }
    );
  }

  const result = await listUsers(parsed.data);
  return Response.json(result);
}
