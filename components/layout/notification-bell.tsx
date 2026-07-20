"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from "@/actions/notification-actions";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: NotificationRow[];
  unreadCount: number;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to load notifications.");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const unreadCount = data?.unreadCount ?? 0;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Bell className="size-4" aria-hidden />
            {unreadCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive" />
            ) : null}
            <span className="sr-only">Notifications{unreadCount > 0 ? ` (${unreadCount} unread)` : ""}</span>
          </button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium text-foreground">Notifications</p>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-1.5 py-0.5 text-xs"
              onClick={async () => {
                await markAllNotificationsReadAction();
                invalidate();
              }}
            >
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!data || data.notifications.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            data.notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={async () => {
                  if (!notification.isRead) {
                    await markNotificationReadAction(notification.id);
                    invalidate();
                  }
                }}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-accent",
                  !notification.isRead && "bg-muted/40"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {!notification.isRead ? (
                    <span className="size-1.5 shrink-0 rounded-full bg-gold" />
                  ) : null}
                  <p className="text-sm font-medium text-foreground">{notification.title}</p>
                </div>
                <p className="text-xs text-muted-foreground">{notification.body}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
