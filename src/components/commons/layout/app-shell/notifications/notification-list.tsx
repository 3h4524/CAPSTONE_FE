"use client";

import { NotificationEmptyState } from "@/components/commons/layout/app-shell/notifications/notification-empty-state";
import { NotificationItem } from "@/components/commons/layout/app-shell/notifications/notification-item";
import type { NotificationDto } from "@/types/notification";

type NotificationListProps = {
  notifications: NotificationDto[];
};

export const NotificationList = ({ notifications }: NotificationListProps) => {
  if (notifications.length === 0) {
    return <NotificationEmptyState />;
  }

  return (
    <div className="flex flex-col">
      {notifications.map((item) => (
        <NotificationItem
          key={item.id}
          notification={item}
        />
      ))}
    </div>
  );
};
