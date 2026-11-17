"use client";

import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { NotificationList } from "@/components/commons/layout/app-shell/notifications/notification-list";
import { Button } from "@/components/ui/button";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { useMarkAllNotificationsAsRead, useNotifications } from "@/hooks/queries/use-notifications";

export const NotificationDropdown = () => {
  const { t } = useTranslation("common");
  const { data: notifications, isLoading } = useNotifications();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  
  const hasUnread = notifications?.some(n => !n.isRead);

  return (
    <DropdownMenuContent align="end" className="max-h-[80vh] w-80 overflow-y-auto">
      <div className="bg-background sticky top-0 z-10 flex items-center justify-between border-b px-2 py-1.5">
        <p className="text-sm font-medium">{t("header.notifications")}</p>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          disabled={!hasUnread || markAllAsRead.isPending}
          onClick={() => markAllAsRead.mutate()}
        >
          {markAllAsRead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("commons.notifications.markAllRead")}
        </Button>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 p-4 text-center text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("commons.notifications.loading")}
        </div>
      ) : (
        <NotificationList notifications={notifications || []} />
      )}
    </DropdownMenuContent>
  );
};
