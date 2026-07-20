import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import type { AuthenticatedUser } from "@/types/auth";

const RECENT_LIMIT = 20;

/** Latest notifications for the actor, plus their current unread count. */
export async function listNotificationsForActor(actor: AuthenticatedUser) {
  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId: actor.id },
      orderBy: { createdAt: "desc" },
      take: RECENT_LIMIT,
    }),
    db.notification.count({ where: { userId: actor.id, isRead: false } }),
  ]);

  return { notifications, unreadCount };
}

export async function markNotificationRead(actor: AuthenticatedUser, id: string) {
  const notification = await db.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== actor.id) {
    throw new AppError(ErrorCode.NOT_FOUND);
  }
  return db.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllNotificationsRead(actor: AuthenticatedUser) {
  await db.notification.updateMany({
    where: { userId: actor.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}
