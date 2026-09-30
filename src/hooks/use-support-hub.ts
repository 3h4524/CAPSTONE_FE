"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { supportTicketKeys } from "@/api/support-tickets";
import { adminSupportTicketsKeys } from "@/hooks/queries/use-admin-support-tickets";
import type { SupportTicketReply } from "@/types/support";
import type { HubConnection} from "@microsoft/signalr";
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { useQueryClient } from "@tanstack/react-query";

// Singleton connection to ensure we only have one socket open
let sharedConnection: HubConnection | null = null;

export const useSupportHub = (ticketId?: string) => {
  const queryClient = useQueryClient();
  const connectionRef = useRef<HubConnection | null>(null);

  useEffect(() => {
    // 1. Khởi tạo hoặc tái sử dụng sợi cáp SignalR
    if (!sharedConnection) {
      sharedConnection = new HubConnectionBuilder()
        .withUrl(`${process.env.NEXT_PUBLIC_API_BASE_URL}/hubs/support`, {
          withCredentials: true,
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build();
    }
    const connection = sharedConnection;
    connectionRef.current = connection;

    // 2. Hàm bắt sóng các sự kiện (Phải gọi bên ngoài để mỗi lần mở Popup đều bắt sóng lại)
    connection.on("ReceiveNewMessage", (reply?: SupportTicketReply) => {
      if (ticketId) {
        if (reply) {
          // Nhét luôn tin nhắn vào màn hình mà không cần gọi api tải lại (Siêu tốc độ)
          queryClient.setQueryData(supportTicketKeys.detail(ticketId), (old: any) => {
            if (!old) return old;
            if (old.replies.some((r: any) => r.id === reply.id)) return old;
            return { ...old, replies: [...old.replies, reply] };
          });
          queryClient.setQueryData(adminSupportTicketsKeys.detail(ticketId), (old: any) => {
            if (!old) return old;
            if (old.replies.some((r: any) => r.id === reply.id)) return old;
            return { ...old, replies: [...old.replies, reply] };
          });
        }
        
        // Vẫn chạy ngầm tải lại để đề phòng miss data
        queryClient.invalidateQueries({ queryKey: supportTicketKeys.detail(ticketId) });
        queryClient.invalidateQueries({ queryKey: adminSupportTicketsKeys.detail(ticketId) });
        
        // Cập nhật cả list luôn để màn hình chia đôi không bị out-sync
        queryClient.invalidateQueries({ queryKey: [...supportTicketKeys.all, "list"] });
        queryClient.invalidateQueries({ queryKey: adminSupportTicketsKeys.lists() });
      }
    });

    // Bắt sự kiện Noti toàn cầu (Cho cái Chuông)
    connection.on("ReceiveNotification", (id: string) => {
      // Xóa cache của trang danh sách để cập nhật trạng thái nếu cần
      queryClient.invalidateQueries({ queryKey: [...supportTicketKeys.all, "list"] });
    });

    // Bắt sự kiện Noti dành riêng cho Admin (Để update list realtime)
    connection.on("ReceiveAdminNotification", (id: string) => {
      queryClient.invalidateQueries({ queryKey: adminSupportTicketsKeys.lists() });
    });

    // 3. Khởi động sợi cáp
    const startConnection = async () => {
      try {
        if (connection.state === "Disconnected") {
          await connection.start();
          console.log("🟢 Đã cắm cáp WebSocket thành công!");
        }

        // Nếu người dùng đang mở 1 cái Ticket cụ thể, xin vào phòng chat đó
        if (ticketId && connection.state === "Connected") {
          await connection.invoke("JoinTicket", ticketId);
        }
      } catch (err) {
        console.error("🔴 Lỗi cắm cáp WebSocket: ", err);
      }
    };

    startConnection();

    // 4. Khi đóng khung chat (Unmount Component)
    return () => {
      if (ticketId && connection.state === "Connected") {
        connection.invoke("LeaveTicket", ticketId).catch(console.error);
      }
      // Lưu ý: Không đóng hẳn connection (connection.stop) để giữ sợi cáp cho Noti toàn cục
      connection.off("ReceiveNewMessage");
      connection.off("ReceiveNotification");
    };
  }, [ticketId, queryClient]);

  return connectionRef.current;
};
