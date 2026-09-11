"use client";

import { NotificationEmptyState } from "@/components/private/app-shell/notifications/notification-empty-state";
import { NotificationItem } from "@/components/private/app-shell/notifications/notification-item";

type NotificationEntry = {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
};

export const NotificationList = () => {
  const items: NotificationEntry[] = [];

  if (items.length === 0) {
    return <NotificationEmptyState />;
  }

  return (
    <div className="flex flex-col">
      {items.map((item) => (
        <NotificationItem
          key={item.id}
          title={item.title}
          description={item.description}
          time={item.time}
        />
      ))}
    </div>
  );
};
