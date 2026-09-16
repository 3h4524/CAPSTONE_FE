"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { type AdminDashboardMetricsDto,getAdminDashboardMetrics } from "@/api/admin";
import { currentUserRequest, logoutRequest } from "@/api/auth";
import { tokenStorage } from "@/api/client";
import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { showToast } from "@/helpers/toast";
import type { AuthenticatedUser } from "@/types/auth";

const AdminDashboardPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<AdminDashboardMetricsDto | null>(null);
  const [timeRange, setTimeRange] = useState("Month");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([currentUserRequest(), getAdminDashboardMetrics(timeRange.toLowerCase())])
      .then(([currentUser, metricsData]) => {
        if (!isMounted) {
          return;
        }

        if (!currentUser.roles.some((role) => role.toLowerCase() === "admin")) {
          router.replace("/");
          return;
        }

        setUser(currentUser);
        setMetrics(metricsData);
      })
      .catch(() => {
        tokenStorage.clearTokens();
        router.replace("/login");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router, timeRange]);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } finally {
      tokenStorage.clearTokens();
      showToast("success", "You have been signed out.");
      router.replace("/login");
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      const { exportAdminDashboardReport } = await import("@/api/admin");
      await exportAdminDashboardReport(timeRange.toLowerCase());
      showToast("success", "Report exported successfully.");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to export report", err);
      showToast("error", "Failed to export report.");
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading && !metrics) {
    return (
      <main className="flex min-h-screen items-center justify-center">Loading dashboard...</main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <AdminDashboardShell 
      fullName={user.fullName} 
      onLogout={handleLogout} 
      metrics={metrics}
      timeRange={timeRange}
      onTimeRangeChange={setTimeRange}
      isExporting={isExporting}
      onExport={handleExport}
    />
  );
};

export default AdminDashboardPage;
