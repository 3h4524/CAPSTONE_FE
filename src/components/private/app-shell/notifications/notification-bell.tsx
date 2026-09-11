"use client";

import { Bell } from "lucide-react";

import { NotificationDropdown } from "@/components/private/app-shell/notifications/notification-dropdown";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const NotificationBell = () => {
  const unreadCount = 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative"
        >
          <Bell />
          {unreadCount > 0 && (
            <span className="bg-destructive absolute top-1.5 right-1.5 size-2 rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <NotificationDropdown />
    </DropdownMenu>
  );
};
