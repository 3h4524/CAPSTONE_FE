"use client";

import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

import { NotificationDropdown } from "@/components/commons/layout/app-shell/notifications/notification-dropdown";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/queries/use-notifications";
import { useNotificationHub } from "@/hooks/use-notification-hub";

export const NotificationBell = () => {
  useNotificationHub();
  const { t } = useTranslation("common");
  const { data: notifications } = useNotifications();
  
  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("header.notifications")}
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
