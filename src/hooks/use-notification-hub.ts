import { useEffect, useState } from "react";

import { notificationApi } from "@/api/notifications";
import { supportTicketKeys } from "@/api/support-tickets";
import { isTransientHubError, signalrLogger } from "@/helpers/signalr-logger";
import { adminSupportTicketsKeys } from "@/hooks/queries/use-admin-support-tickets";
import { sellerDashboardKeys } from "@/hooks/queries/use-dashboard-summary";
import { notificationKeys } from "@/hooks/queries/use-notifications";
import type { NotificationDto } from "@/types/notification";
import type { HubConnection } from "@microsoft/signalr";
import { HubConnectionBuilder } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";

let sharedConnection: HubConnection | null = null;
let sharedStartPromise: Promise<void> | null = null;
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
          .configureLogging(signalrLogger)
          .build();

        // Lắng nghe sự kiện ReceiveNotification
        sharedConnection.on("ReceiveNotification", (notification: NotificationDto) => {
          const currentUrl =
            typeof window !== "undefined" ? window.location.pathname + window.location.search : "";

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
          // Một batch xong hay lỗi đều đổi số liệu và việc cần làm trên Dashboard
          queryClient.invalidateQueries({ queryKey: sellerDashboardKeys.all });
        });

        try {
          sharedStartPromise ??= sharedConnection.start().finally(() => {
            sharedStartPromise = null;
          });
          await sharedStartPromise;
          if (mounted && sharedConnection?.state === "Connected") setIsConnected(true);
        } catch (err) {
          // The connection can be stopped by the last cleanup while a dev-mode
          // effect is being replayed. Do not report that expected transition as
          // a user-facing connection error.
          const wasStoppedDuringNegotiation =
            err instanceof Error && err.message.includes("stopped during negotiation");
          if (mounted && !wasStoppedDuringNegotiation) {
            // An API that is restarting is not a page error: notifications resume once it is back.
            // eslint-disable-next-line no-console
            if (isTransientHubError(err)) console.warn("Notification hub not connected yet:", err);
            // eslint-disable-next-line no-console
            else console.error("SignalR NotificationHub Connection Error: ", err);
          }
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
        const connectionToStop = sharedConnection;
        const stopWhenReady = async () => {
          if (sharedStartPromise) {
            try {
              await sharedStartPromise;
            } catch {
              // The failed start has already been handled by the connector.
            }
          }

          if (connectionCount === 0 && sharedConnection === connectionToStop) {
            await connectionToStop.stop();
            if (sharedConnection === connectionToStop) sharedConnection = null;
          }
        };

        void stopWhenReady();
      }
    };
  }, [queryClient]);

  return { isConnected };
};
