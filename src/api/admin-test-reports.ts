import { api } from "@/api/client";
import type {
  TestReportDetail,
  TestReportFilter,
  TestReportList,
  TestReportRun,
} from "@/types/admin-test-reports";

export const getAdminTestReports = async (
  filter: TestReportFilter
): Promise<TestReportList> => {
  const params = new URLSearchParams();
  if (filter.fromUtc) params.append("fromUtc", filter.fromUtc);
  if (filter.toUtc) params.append("toUtc", filter.toUtc);
  if (filter.status) params.append("status", filter.status);
  if (filter.pageIndex) params.append("pageIndex", String(filter.pageIndex));
  if (filter.pageSize) params.append("pageSize", String(filter.pageSize));

  const { data } = await api.get<TestReportList>(
    `/api/admin/test-reports?${params.toString()}`
  );
  return data;
};

export const getAdminTestReport = async (
  runId: string
): Promise<TestReportDetail> => {
  const { data } = await api.get<TestReportDetail>(
    `/api/admin/test-reports/${encodeURIComponent(runId)}`
  );
  return data;
};

export const startAdminTestReportRun = async (): Promise<TestReportRun> => {
  const { data } = await api.post<TestReportRun>("/api/admin/test-reports/runs");
  return data;
};

export const deleteAdminTestReport = async (runId: string): Promise<void> => {
  await api.delete(`/api/admin/test-reports/${encodeURIComponent(runId)}`);
};
