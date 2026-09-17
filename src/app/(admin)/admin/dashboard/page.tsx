"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { PageLoading } from "@/components/commons/layout/page-loading";
import { useExportAdminDashboardReport } from "@/hooks/mutations/use-export-admin-dashboard-report";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useAdminDashboardMetrics } from "@/hooks/queries/use-admin-dashboard-metrics";
import { useAuthStore } from "@/stores/auth";

const AdminDashboardPage = () => {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState("Month");
  const user = useAuthStore((state) => state.user);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const { data: metrics, isLoading: isMetricsLoading } = useAdminDashboardMetrics(
    timeRange.toLowerCase()
  );
  const { mutate: logout } = useLogout();
  const { mutate: exportReport, isPending: isExporting } = useExportAdminDashboardReport();

  const isAdmin = Boolean(user?.roles.some((role) => role.toLowerCase() === "admin"));

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isHydrated, user, isAdmin, router]);

  const handleLogout = () => logout(undefined, { onSettled: () => router.replace("/login") });

  const handleExport = () => exportReport(timeRange.toLowerCase());

  if (!isHydrated || isMetricsLoading) {
    return <PageLoading label="Loading dashboard" />;
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <AdminDashboardShell
      fullName={user.fullName}
      onLogout={handleLogout}
      metrics={metrics ?? null}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      isExporting={isExporting}
      onExport={handleExport}
    />
  );
};

export default AdminDashboardPage;
