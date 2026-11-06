"use client";

import { Bell } from "lucide-react";

import { NotificationDropdown } from "@/components/commons/layout/app-shell/notifications/notification-dropdown";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/queries/use-notifications";
import { useNotificationHub } from "@/hooks/use-notification-hub";

export const NotificationBell = () => {
  useNotificationHub();
  const { data: notifications } = useNotifications();
  
  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative max-md:size-10 max-md:rounded-full max-md:border [@media(pointer:coarse)]:max-md:min-h-10 [@media(pointer:coarse)]:max-md:min-w-10"
        >
          <Bell />
          {unreadCount > 0 && (
            <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full max-md:bg-emerald-500" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <NotificationDropdown />
    </DropdownMenu>
  );
};
