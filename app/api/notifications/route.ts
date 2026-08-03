import { withTenantApiUser } from "@/lib/auth/guards";
import { listNotificationsForActor } from "@/lib/services/notification-service";

export async function GET() {
  return withTenantApiUser(async (user) => {
    const result = await listNotificationsForActor(user);
    return Response.json(result);
  });
}
