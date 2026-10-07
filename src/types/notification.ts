export type NotificationSeverity = "info" | "warning" | "error" | "success";

export interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  severity: NotificationSeverity;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
}
