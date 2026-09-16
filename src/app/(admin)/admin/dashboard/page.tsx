"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminDashboardShell } from "@/components/admin/admin-dashboard-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useExportAdminDashboardReport } from "@/hooks/mutations/use-export-admin-dashboard-report";
import { useLogout } from "@/hooks/mutations/use-logout";
import { useAdminDashboardMetrics } from "@/hooks/queries/use-admin-dashboard-metrics";
import { useCurrentUser } from "@/hooks/queries/use-current-user";

const AdminDashboardPage = () => {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState("Month");
  const { data: user, isLoading: isUserLoading, isError: isUserError } = useCurrentUser();
  const { data: metrics, isLoading: isMetricsLoading } = useAdminDashboardMetrics(
    timeRange.toLowerCase()
  );
  const { mutate: logout } = useLogout();
  const { mutate: exportReport, isPending: isExporting } = useExportAdminDashboardReport();

  const isAdmin = Boolean(user?.roles.some((role) => role.toLowerCase() === "admin"));

  useEffect(() => {
    if (isUserLoading) {
      return;
    }

    if (isUserError || !user) {
      router.replace("/login");
      return;
    }

    if (!isAdmin) {
      router.replace("/");
    }
  }, [isUserLoading, isUserError, user, isAdmin, router]);

  const handleLogout = () => logout(undefined, { onSettled: () => router.replace("/login") });

  const handleExport = () => exportReport(timeRange.toLowerCase());

  if (isUserLoading || isMetricsLoading) {
    return (
      <main className="bg-muted/30 min-h-screen px-6 py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <section className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </section>
        </div>
      </main>
    );
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
