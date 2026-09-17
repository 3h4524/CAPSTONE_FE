import type { AdminDashboardMetricsDto, AdminUserDto, GetUsersRequest, PagedResult } from "@/types/admin";

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

export const getAdminUsers = async (
  request: GetUsersRequest
): Promise<PagedResult<AdminUserDto>> => {
  const params = new URLSearchParams();
  if (request.pageIndex) params.append("pageIndex", request.pageIndex.toString());
  if (request.pageSize) params.append("pageSize", request.pageSize.toString());
  if (request.searchTerm) params.append("searchTerm", request.searchTerm);
  if (request.role) params.append("role", request.role);
  if (request.plan) params.append("plan", request.plan);
  if (request.status) params.append("status", request.status);
  if (request.sortBy) params.append("sortBy", request.sortBy);
  if (request.sortDesc !== undefined) params.append("sortDesc", request.sortDesc.toString());

  const { data } = await api.get<PagedResult<AdminUserDto>>(
    `/api/admin/users?${params.toString()}`
  );
  return data;
};

export const suspendAdminUser = async (id: string): Promise<void> => {
  await api.post(`/api/admin/users/${id}/suspend`);
};

export const unlockAdminUser = async (id: string): Promise<void> => {
  await api.post(`/api/admin/users/${id}/unlock`);
};

export const getAdminPlans = async (): Promise<string[]> => {
  const { data } = await api.get<string[]>("/api/admin/users/plans");
  return data;
};
