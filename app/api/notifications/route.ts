import { requireApiUser } from "@/lib/auth/guards";
import { listNotificationsForActor } from "@/lib/services/notification-service";

export async function GET() {
  const guard = await requireApiUser();
  if (guard.response) return guard.response;

  const result = await listNotificationsForActor(guard.user);
  return Response.json(result);
}
