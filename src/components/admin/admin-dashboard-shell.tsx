"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  ChevronDown,
  Database,
  Download,
  Headphones,
  Package,
  Users,
} from "lucide-react";

import { AdminActivityPanels } from "@/components/admin/admin-activity-panels";
import { healthChecks } from "@/components/admin/admin-attention-panel";
import { AdminHealthCheckDrawer } from "@/components/admin/admin-health-check-drawer";
import { AdminHeroCard } from "@/components/admin/admin-hero-card";
import { AdminMetricCard, Delta } from "@/components/admin/admin-metric-card";
import { AdminOperationsRow } from "@/components/admin/admin-operations-row";
import { AdminRevenueTrend } from "@/components/admin/admin-revenue-trend";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DASHBOARD_RANGES, statisticsWindow } from "@/helpers/admin-dashboard";
import { dashboardTrendFilter } from "@/helpers/revenue-trend";
import { useAdminOperations } from "@/hooks/queries/use-admin-operations";
import { useRevenueInsights, useRevenueMetrics } from "@/hooks/queries/use-revenue";
import { useSystemStatisticsOverview } from "@/hooks/queries/use-system-statistics";
import type { AdminDashboardMetricsDto } from "@/types/admin";
import { formatVnd } from "@/utils/format-currency";

type AdminDashboardShellProps = {
  fullName: string;
  onLogout: () => void;
  metrics: AdminDashboardMetricsDto | null;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  isExporting: boolean;
  onExport: () => void;
};

const AdminDashboardShell = (props: AdminDashboardShellProps) => (
  <AdminDashboardContent {...props} />
);

const AdminDashboardContent = ({
  fullName,
  onLogout,
  metrics,
  timeRange,
  onTimeRangeChange,
  isExporting,
  onExport,
}: AdminDashboardShellProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);

  const paidShare =
    metrics && metrics.totalUsers > 0
      ? Math.round((metrics.activePaidUsers / metrics.totalUsers) * 100)
      : 0;
  const activeJobs = metrics?.activeBatchJobs ?? 0;
  const pendingTickets = metrics?.pendingTickets ?? 0;
  const range = DASHBOARD_RANGES.find((option) => option.key === timeRange) ?? DASHBOARD_RANGES[0];
  const rangeLabel = range.label;

  // The Revenue and System Statistics pages' figures, for the same period, so each number shows its trend.
  const revenueFilter = useMemo(() => dashboardTrendFilter(timeRange), [timeRange]);
  const { data: revenue } = useRevenueMetrics(revenueFilter);
  const { data: insights } = useRevenueInsights(revenueFilter);
  const statsWindow = statisticsWindow(timeRange);
  // Upload health and pipeline errors.
  const { data: statistics } = useSystemStatisticsOverview({ timeRange: statsWindow.timeRange });
  const { data: operations, isLoading: isOperationsLoading } = useAdminOperations(
    timeRange.toLowerCase()
  );
  const revenueValue = revenue?.totalRevenue.value ?? metrics?.totalRevenue ?? 0;
  const mrrValue = revenue?.subscriptionMrr.value ?? metrics?.recurringRevenue ?? 0;

  // Compute health check items to feed into Hero summary and Drawer
  const checks = useMemo(
    () =>
      healthChecks({
        financialAlerts: insights?.financialAlerts,
        integrationStatus: statistics?.integrationStatus,
        recentErrors: statistics?.recentErrors,
        aiUsage: operations?.aiUsage,
        pendingTickets,
      }),
    [insights, statistics, operations, pendingTickets]
  );

  return (
    <div className="h-dvh overflow-hidden bg-[#f8fafc] text-slate-900">
      <div className="flex h-dvh">
        <AdminSidebar
          fullName={fullName}
          onLogout={onLogout}
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
        />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="h-dvh overflow-y-auto">
            <AdminTopbar fullName={fullName} onMenuClick={() => setIsMobileSidebarOpen(true)} />
            <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-[calc(1.5rem+1cm)] sm:py-5 2xl:max-w-[1720px]">
              {/* Header */}
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                    Platform overview
                  </p>
                  <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                    Admin Dashboard
                  </h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Growth, production and what needs your attention, for the period you pick.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8.5 cursor-pointer gap-1.5 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
                      >
                        {rangeLabel}
                        <ChevronDown className="size-3.5 text-slate-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 rounded-xl">
                      {DASHBOARD_RANGES.map((option) => (
                        <DropdownMenuItem
                          key={option.key}
                          onClick={() => onTimeRangeChange(option.key)}
                          className={`text-xs ${timeRange === option.key ? "text-primary font-semibold" : ""}`}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8.5 cursor-pointer gap-1.5 rounded-xl border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
                    onClick={onExport}
                    disabled={isExporting}
                  >
                    <Download className="size-3.5" /> {isExporting ? "Exporting..." : "Export Report"}
                  </Button>
                </div>
              </div>

              {/* 5 KPI Metric Cards */}
              <section className="mt-4.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
                <AdminMetricCard
                  label="Users"
                  value={metrics?.totalUsers.toLocaleString() ?? "-"}
                  context={`${paidShare}% on a paid plan (${metrics?.activePaidUsers.toLocaleString() ?? 0})`}
                  sparkline={
                    metrics?.totalUsers
                      ? [
                          Math.max(1, Math.round(metrics.totalUsers * 0.7)),
                          Math.round(metrics.totalUsers * 0.82),
                          Math.round(metrics.totalUsers * 0.9),
                          metrics.totalUsers,
                        ]
                      : [10, 12, 14, 17]
                  }
                  icon={Users}
                />
                <AdminMetricCard
                  label="Revenue"
                  value={formatVnd(revenueValue)}
                  exactValue={formatVnd(revenueValue)}
                  context={
                    <Delta
                      percent={revenue?.totalRevenue.percentageChange}
                      suffix={`vs previous ${range.period}`}
                    />
                  }
                  sparkline={revenue?.totalRevenue.sparkline}
                  icon={Database}
                />
                <AdminMetricCard
                  label="Monthly recurring revenue"
                  value={formatVnd(mrrValue)}
                  exactValue={formatVnd(mrrValue)}
                  context={
                    <Delta
                      percent={revenue?.subscriptionMrr.percentageChange}
                      suffix="vs start of period"
                    />
                  }
                  sparkline={revenue?.subscriptionMrr.sparkline}
                  icon={BarChart3}
                />
                <AdminMetricCard
                  label="Products made"
                  value={operations ? operations.funnel.products.toLocaleString() : "-"}
                  context={
                    operations
                      ? `${operations.activeSellers.toLocaleString()} sellers · ${activeJobs} job${activeJobs === 1 ? "" : "s"} running`
                      : "Loading…"
                  }
                  sparkline={operations?.throughput.map((bucket) => bucket.products)}
                  icon={Package}
                />
                <AdminMetricCard
                  label="Open tickets"
                  value={pendingTickets.toLocaleString()}
                  context={
                    pendingTickets > 0 ? (
                      <span className="font-medium text-rose-600">Awaiting a reply</span>
                    ) : (
                      "Support queue is clear"
                    )
                  }
                  icon={Headphones}
                  className="sm:col-span-2 lg:col-span-1"
                />
              </section>

              {/* Row 2: Admin Hero Welcome (Health Check) + Revenue Trend */}
              <div className="mt-4.5 grid gap-4.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)]">
                <AdminHeroCard
                  fullName={fullName}
                  healthChecks={checks}
                  onOpenHealthCheck={() => setIsHealthCheckOpen(true)}
                />
                <AdminRevenueTrend timeRange={timeRange} />
              </div>

              {/* Row 3: Production Overview */}
              <div className="mt-4.5">
                <AdminOperationsRow operations={operations} isLoading={isOperationsLoading} />
              </div>

              {/* Row 4: Recent Activity */}
              <div className="mt-4.5">
                <AdminActivityPanels
                  latestTickets={metrics?.latestTickets}
                  recentBatchJobs={metrics?.recentBatchJobs}
                  totalBatchJobs={metrics?.totalBatchJobs}
                />
              </div>

              <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-[10px] text-slate-400">
                <span>APCS Admin Console · Platform overview</span>
                <span className="flex items-center gap-1">
                  <Activity className="size-3" /> Last synced just now
                </span>
              </footer>
            </main>

            {/* Health Check Drawer (Slide-over panel like Seller's ActionInbox) */}
            <AdminHealthCheckDrawer
              open={isHealthCheckOpen}
              onOpenChange={setIsHealthCheckOpen}
              healthChecks={checks}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export { AdminDashboardShell };
