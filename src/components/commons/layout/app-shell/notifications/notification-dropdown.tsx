"use client";

import { NotificationList } from "@/components/commons/layout/app-shell/notifications/notification-list";
import { Button } from "@/components/ui/button";
import { DropdownMenuContent } from "@/components/ui/dropdown-menu";

import { useMarkAllNotificationsAsRead, useNotifications } from "@/hooks/queries/use-notifications";
import { Loader2 } from "lucide-react";

export const NotificationDropdown = () => {
  const { data: notifications, isLoading } = useNotifications();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  
  const hasUnread = notifications?.some(n => !n.isRead);

  return (
    <DropdownMenuContent align="end" className="w-80 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between px-2 py-1.5 border-b sticky top-0 bg-background z-10">
        <p className="text-sm font-medium">Thông báo</p>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          disabled={!hasUnread || markAllAsRead.isPending}
          onClick={() => markAllAsRead.mutate()}
        >
          {markAllAsRead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Đánh dấu đã đọc"}
        </Button>
      </div>
      {isLoading ? (
        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
        </div>
      ) : (
        <NotificationList notifications={notifications || []} />
      )}
    </DropdownMenuContent>
  );
};
