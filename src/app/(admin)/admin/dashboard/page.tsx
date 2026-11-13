"use client";

import { useState } from "react";

import { AdminDashboardContent } from "@/components/admin/admin-dashboard-content";
import { AdminShell } from "@/components/admin/admin-shell";
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

  return (
    <AdminShell>
      {isMetricsLoading ? (
        <PageLoading label="Loading dashboard" />
      ) : (
        <AdminDashboardContent
          fullName={user.fullName}
          metrics={metrics ?? null}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          isExporting={isExporting}
          onExport={handleExport}
        />
      )}
    </AdminShell>
  );
};

export default AdminDashboardPage;
