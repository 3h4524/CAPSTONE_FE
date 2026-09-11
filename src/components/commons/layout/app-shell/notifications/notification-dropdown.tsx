"use client";

import { NotificationList } from "@/components/commons/layout/app-shell/notifications/notification-list";
import { Button } from "@/components/ui/button";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";

export const NotificationDropdown = () => {
  return (
    <DropdownMenuContent align="end" className="w-80">
      <div className="flex items-center justify-between px-2 py-1.5">
        <p className="text-sm font-medium">Notifications</p>
        <Button type="button" variant="ghost" size="sm" disabled>
          Mark all read
        </Button>
      </div>
      <NotificationList />
    </DropdownMenuContent>
  );
};
