"use client";

import { Loader2 } from "lucide-react";

import { NotificationList } from "@/components/commons/layout/app-shell/notifications/notification-list";
import { Button } from "@/components/ui/button";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { useMarkAllNotificationsAsRead, useNotifications } from "@/hooks/queries/use-notifications";

export const NotificationDropdown = () => {
  const { data: notifications, isLoading } = useNotifications();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  
  const hasUnread = notifications?.some(n => !n.isRead);

  return (
    <DropdownMenuContent align="end" className="max-h-[80vh] w-80 overflow-y-auto">
      <div className="bg-background sticky top-0 z-10 flex items-center justify-between border-b px-2 py-1.5">
        <p className="text-sm font-medium">Thông báo</p>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          disabled={!hasUnread || markAllAsRead.isPending}
          onClick={() => markAllAsRead.mutate()}
        >
          {markAllAsRead.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Đánh dấu đã đọc"}
        </Button>
      </div>
      {isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 p-4 text-center text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Đang tải...
        </div>
      ) : (
        <NotificationList notifications={notifications || []} />
      )}
    </DropdownMenuContent>
  );
};
