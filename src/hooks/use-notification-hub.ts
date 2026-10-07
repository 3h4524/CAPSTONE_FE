import { useEffect, useState } from "react";

import { notificationApi } from "@/api/notifications";
import { supportTicketKeys } from "@/api/support-tickets";
import { adminSupportTicketsKeys } from "@/hooks/queries/use-admin-support-tickets";
import { notificationKeys } from "@/hooks/queries/use-notifications";
import type { NotificationDto } from "@/types/notification";
import type { HubConnection} from "@microsoft/signalr";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";

let sharedConnection: HubConnection | null = null;
let connectionCount = 0;

export const useNotificationHub = () => {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let mounted = true;

    const connect = async () => {
      connectionCount++;

      if (!sharedConnection) {
        sharedConnection = new HubConnectionBuilder()
          .withUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL}/hubs/notification`, {
            withCredentials: true,
          })
          .withAutomaticReconnect()
          .configureLogging(LogLevel.Warning)
          .build();

        // Lắng nghe sự kiện ReceiveNotification
        sharedConnection.on("ReceiveNotification", (notification: NotificationDto) => {
          const currentUrl = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
          
          if (notification.actionUrl && currentUrl.includes(notification.actionUrl)) {
            // Bỏ qua việc kêu chuông và tự động đánh dấu đã đọc (Trải nghiệm UX tốt hơn)
            // eslint-disable-next-line no-console
            notificationApi.markAsRead(notification.id).catch(console.error);
          } else {
            // Invalidate danh sách để chuông tự động lấy số lượng mới (hiện chấm đỏ)
            queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
          }
          
          // Invalidate luôn danh sách Ticket để cập nhật chữ "New" nếu người dùng đang ở trang Support
          queryClient.invalidateQueries({ queryKey: [...supportTicketKeys.all, "list"] });
          queryClient.invalidateQueries({ queryKey: adminSupportTicketsKeys.lists() });
        });

        try {
          await sharedConnection.start();
          if (mounted) setIsConnected(true);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("SignalR NotificationHub Connection Error: ", err);
        }
      } else {
        if (sharedConnection.state === "Connected") {
          setIsConnected(true);
        } else {
          sharedConnection.onreconnected(() => {
            if (mounted) setIsConnected(true);
          });
        }
      }
    };

    connect();

    return () => {
      mounted = false;
      connectionCount--;

      if (connectionCount === 0 && sharedConnection) {
        // Chỉ ngắt kết nối khi không còn component nào sử dụng hook này
        // Tuy nhiên với NotificationHub, nó thường sống 24/7 ở cấp App
        sharedConnection.stop();
        sharedConnection = null;
      }
    };
  }, [queryClient]);

  return { isConnected };
};
