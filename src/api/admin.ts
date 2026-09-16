import type { AdminDashboardMetricsDto } from "@/types/admin";

import { api } from "./client";

export const getAdminDashboardMetrics = async (
  timeRange: string = "month",
  date?: Date
): Promise<AdminDashboardMetricsDto> => {
  const params = new URLSearchParams();
  params.append("timeRange", timeRange);
  if (date) {
    params.append("date", date.toISOString());
  }
  const { data } = await api.get<AdminDashboardMetricsDto>(
    `/api/admin/dashboard/metrics?${params.toString()}`
  );
  return data;
};

export const exportAdminDashboardReport = async (
  timeRange: string = "month",
  date?: Date
): Promise<void> => {
  const params = new URLSearchParams();
  params.append("timeRange", timeRange);
  if (date) {
    params.append("date", date.toISOString());
  }

  const response = await api.get<Blob>(`/api/admin/dashboard/export?${params.toString()}`, {
    responseType: "blob",
  });

  const contentDisposition = response.headers["content-disposition"];
  let fileName = `Admin_Report_${timeRange}.csv`;
  if (typeof contentDisposition === "string" && contentDisposition.includes("filename=")) {
    fileName = contentDisposition.split("filename=")[1].replace(/"/g, "");
  }

  const downloadUrl = window.URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.style.display = "none";
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(downloadUrl);
  anchor.remove();
};
