"use client";

import { useState } from "react";

import { AdminDashboardContent } from "@/components/admin/admin-dashboard-content";
import { PageLoading } from "@/components/commons/layout/page-loading";
import { useExportAdminDashboardReport } from "@/hooks/mutations/use-export-admin-dashboard-report";
import { useAdminDashboardMetrics } from "@/hooks/queries/use-admin-dashboard-metrics";
import { useAuthStore } from "@/stores/auth";

const AdminDashboardPage = () => {
  const [timeRange, setTimeRange] = useState("Year");
  const user = useAuthStore((state) => state.user);
  const { mutate: exportReport, isPending: isExporting } = useExportAdminDashboardReport();

  const { data: metrics, isLoading: isMetricsLoading } = useAdminDashboardMetrics(
    timeRange.toLowerCase(),
    Boolean(user)
  );

  const handleExport = () => exportReport(timeRange.toLowerCase());

  if (!user) {
    return null;
  }

  if (isMetricsLoading) {
    return <PageLoading label="Loading dashboard" />;
  }

  return (
    <AdminDashboardContent
      fullName={user.fullName}
      metrics={metrics ?? null}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      isExporting={isExporting}
      onExport={handleExport}
    />
  );
};

export default AdminDashboardPage;
