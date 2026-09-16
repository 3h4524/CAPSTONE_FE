import { api } from "./client";

export type MonthlyRevenueDto = {
  month: string;
  subscriptions: number;
  usage: number;
};

export type SupportTicketDto = {
  userName: string;
  userEmail: string;
  issue: string;
  status: string;
  priority: string;
};

export type BatchJobDto = {
  name: string;
  itemCount: number;
  status: string;
  progressPercentage: string;
  userName: string;
  tone: string;
};

export type AdminDashboardMetricsDto = {
  totalUsers: number;
  activePaidUsers: number;
  totalRevenue: number;
  recurringRevenue: number;
  activeBatchJobs: number;
  pendingTickets: number;
  revenueChart: MonthlyRevenueDto[];
  latestTickets: SupportTicketDto[];
  recentBatchJobs: BatchJobDto[];
};

export const getAdminDashboardMetrics = async (timeRange: string = "month", date?: Date): Promise<AdminDashboardMetricsDto> => {
  const params = new URLSearchParams();
  params.append("timeRange", timeRange);
  if (date) {
    params.append("date", date.toISOString());
  }
  const { data } = await api.get<AdminDashboardMetricsDto>(`/api/admin/dashboard/metrics?${params.toString()}`);
  return data;
};

export const exportAdminDashboardReport = async (timeRange: string = "month", date?: Date): Promise<void> => {
  const params = new URLSearchParams();
  params.append("timeRange", timeRange);
  if (date) {
    params.append("date", date.toISOString());
  }
  
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const url = `${baseUrl}/api/admin/dashboard/export?${params.toString()}`;
  const token = localStorage.getItem("access_token");
  
  // Since we need to pass Auth header, we can use fetch and then create a blob URL
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("Failed to export report");
  }

  const blob = await response.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.style.display = "none";
  a.href = downloadUrl;
  
  // Extract filename from Content-Disposition if present, or generate one
  const contentDisposition = response.headers.get("Content-Disposition");
  let fileName = `Admin_Report_${timeRange}.csv`;
  if (contentDisposition && contentDisposition.includes("filename=")) {
    fileName = contentDisposition.split("filename=")[1].replace(/"/g, "");
  }
  
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(downloadUrl);
  a.remove();
};
