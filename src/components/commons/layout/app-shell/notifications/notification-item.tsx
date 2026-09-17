"use client";

import { Bell } from "lucide-react";

type NotificationItemProps = {
  title: string;
  description: string;
  time: string;
};

export const NotificationItem = ({ title, description, time }: NotificationItemProps) => {
  return (
    <div className="flex items-start gap-3 px-2 py-2.5">
      <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
        <Bell className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block truncate text-xs">{description}</span>
        <span className="text-muted-foreground block text-xs">{time}</span>
      </span>
    </div>
  );
};
