"use client";

import { Bell } from "lucide-react";

import { NotificationDto } from "@/types/notification";
import { useMarkNotificationAsRead } from "@/hooks/queries/use-notifications";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useRouter } from "next/navigation";

type NotificationItemProps = {
  notification: NotificationDto;
};

export const NotificationItem = ({ notification }: NotificationItemProps) => {
  const router = useRouter();
  const markAsRead = useMarkNotificationAsRead();

  const handleClick = () => {
    if (!notification.isRead) {
      markAsRead.mutate(notification.id);
    }
    if (notification.actionUrl) {
      let url = notification.actionUrl;
      
      // Fix old action urls for Admin
      if (url.startsWith("/admin/support-tickets/") && !url.includes("?ticketId=")) {
         const id = url.split("/").pop();
         url = `/admin/support-tickets?ticketId=${id}`;
      }
      // Fix old action urls for Seller
      if (url.startsWith("/support-center/ticket/")) {
         const id = url.split("/").pop();
         url = `/support?ticket=${id}`;
      }
      
      router.push(url);
      
      // Đóng dropdown (Trick của Radix UI)
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true, locale: vi });

  return (
    <div 
      className={`flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b last:border-b-0 ${!notification.isRead ? "bg-muted/20" : ""}`}
      onClick={handleClick}
    >
      <span className="bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full">
        <Bell className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${!notification.isRead ? "font-bold text-foreground" : "font-medium text-foreground/80"}`}>{notification.title}</span>
        <span className="text-muted-foreground block line-clamp-2 text-xs mt-0.5">{notification.message}</span>
        <span className="text-primary/70 block text-[11px] font-medium mt-1">{timeAgo}</span>
      </span>
      {!notification.isRead && (
        <span className="flex size-2 shrink-0 rounded-full bg-blue-500 mt-2" />
      )}
    </div>
  );
};
