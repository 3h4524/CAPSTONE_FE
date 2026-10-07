import { NotificationDto } from "@/types/notification";
import { api } from "@/api/client";

export const notificationApi = {
  getNotifications: async (): Promise<NotificationDto[]> => {
    const response = await api.get<NotificationDto[]>("/api/Notifications");
    return response.data;
  },
  markAsRead: async (id: string): Promise<void> => {
    await api.put(`/api/Notifications/${id}/read`);
  },
  markAllAsRead: async (): Promise<void> => {
    await api.put("/api/Notifications/read-all");
  }
};
