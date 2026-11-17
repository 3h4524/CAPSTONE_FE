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
import { useTranslation } from "react-i18next";

import { AdminActivityPanels } from "@/components/admin/admin-activity-panels";
import { healthChecks } from "@/components/admin/admin-attention-panel";
import { AdminHealthCheckDrawer } from "@/components/admin/admin-health-check-drawer";
import { AdminHeroCard } from "@/components/admin/admin-hero-card";
import { AdminMetricCard, Delta } from "@/components/admin/admin-metric-card";
import { AdminOperationsRow } from "@/components/admin/admin-operations-row";
import { AdminRevenueTrend } from "@/components/admin/admin-revenue-trend";
import { PageHeader } from "@/components/commons/layout/page-header";
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

type AdminDashboardContentProps = {
  fullName: string;
  metrics: AdminDashboardMetricsDto | null;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  isExporting: boolean;
  onExport: () => void;
};

const RANGE_LABEL_KEYS: Record<string, string> = {
  Week: "admin.dashboard.ranges.week",
  Month: "admin.dashboard.ranges.month",
  HalfYear: "admin.dashboard.ranges.halfYear",
  Year: "admin.dashboard.ranges.year",
};

const RANGE_PERIOD_KEYS: Record<string, string> = {
  Week: "admin.dashboard.periods.week",
  Month: "admin.dashboard.periods.month",
  HalfYear: "admin.dashboard.periods.halfYear",
  Year: "admin.dashboard.periods.year",
};

export const AdminDashboardContent = ({
  fullName,
  metrics,
  timeRange,
  onTimeRangeChange,
  isExporting,
  onExport,
}: AdminDashboardContentProps) => {
  const { t } = useTranslation("common");
  const [isHealthCheckOpen, setIsHealthCheckOpen] = useState(false);

  const paidShare =
    metrics && metrics.totalUsers > 0
      ? Math.round((metrics.activePaidUsers / metrics.totalUsers) * 100)
      : 0;
  const activeJobs = metrics?.activeBatchJobs ?? 0;
  const pendingTickets = metrics?.pendingTickets ?? 0;
  const range = DASHBOARD_RANGES.find((option) => option.key === timeRange) ?? DASHBOARD_RANGES[0];
  const rangeLabel = t(RANGE_LABEL_KEYS[range.key] ?? RANGE_LABEL_KEYS.Week);
  const rangePeriod = t(RANGE_PERIOD_KEYS[range.key] ?? RANGE_PERIOD_KEYS.Week);

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

  const checks = healthChecks({
    financialAlerts: insights?.financialAlerts,
    integrationStatus: statistics?.integrationStatus,
    recentErrors: statistics?.recentErrors,
    aiUsage: operations?.aiUsage,
    pendingTickets,
  });

  return (
    <>
      <div className="max-md:flex max-md:flex-col max-md:gap-3.5">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 max-md:gap-0 lg:flex-row lg:items-end">
          <PageHeader
            className="max-md:sr-only"
            eyebrow={t("admin.dashboard.header.platformOverview")}
            title={t("admin.dashboard.header.title")}
            description={t("admin.dashboard.header.description")}
          />
          <div className="flex flex-wrap items-center gap-2 max-md:flex-nowrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-ink-200 bg-card text-ink-700 hover:bg-ink-50 h-8.5 cursor-pointer gap-1.5 rounded-xl px-3.5 text-xs font-medium shadow-2xs max-md:flex-1"
                >
                  {rangeLabel}
                  <ChevronDown className="text-ink-500 size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 rounded-xl">
                {DASHBOARD_RANGES.map((option) => (
                  <DropdownMenuItem
                    key={option.key}
                    onClick={() => onTimeRangeChange(option.key)}
                    className={`text-xs ${timeRange === option.key ? "text-primary font-semibold" : ""}`}
                  >
                    {t(RANGE_LABEL_KEYS[option.key] ?? RANGE_LABEL_KEYS.Week)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              className="border-ink-200 bg-card text-ink-700 hover:bg-ink-50 h-8.5 cursor-pointer gap-1.5 rounded-xl px-3.5 text-xs font-medium shadow-2xs max-md:flex-1"
              onClick={onExport}
              disabled={isExporting}
            >
              <Download className="size-3.5" />{" "}
              {isExporting ? t("admin.dashboard.header.exporting") : t("admin.dashboard.header.exportReport")}
            </Button>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <section className="mt-4.5 grid gap-3.5 max-md:mt-0 max-md:grid-cols-2 max-md:gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
          <AdminMetricCard
            label={t("admin.dashboard.kpi.users")}
            value={metrics?.totalUsers.toLocaleString() ?? "-"}
            context={t("admin.dashboard.kpi.paidShare", {
              share: paidShare,
              paid: metrics?.activePaidUsers.toLocaleString() ?? 0,
            })}
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
            label={t("admin.dashboard.kpi.revenue")}
            value={formatVnd(revenueValue)}
            exactValue={formatVnd(revenueValue)}
            context={
              <Delta
                percent={revenue?.totalRevenue.percentageChange}
                suffix={t("admin.dashboard.vsPreviousPeriod", { period: rangePeriod })}
              />
            }
            sparkline={revenue?.totalRevenue.sparkline}
            icon={Database}
          />
          <AdminMetricCard
            label={<>{t("admin.dashboard.kpi.mrrLabel")}<span className="max-md:hidden">{t("admin.dashboard.kpi.mrrLabelSuffix")}</span></>}
            value={formatVnd(mrrValue)}
            exactValue={formatVnd(mrrValue)}
            context={
              <Delta
                percent={revenue?.subscriptionMrr.percentageChange}
                suffix={t("admin.dashboard.vsStartOfPeriod")}
              />
            }
            sparkline={revenue?.subscriptionMrr.sparkline}
            icon={BarChart3}
          />
          <AdminMetricCard
            label={t("admin.dashboard.kpi.productsMade")}
            value={operations ? operations.funnel.products.toLocaleString() : "-"}
            context={
              operations
                ? t("admin.dashboard.kpi.sellersJobsRunning", {
                    sellers: operations.activeSellers.toLocaleString(),
                    count: activeJobs,
                  })
                : t("admin.dashboard.kpi.loading")
            }
            sparkline={operations?.throughput.map((bucket) => bucket.products)}
            icon={Package}
          />
          <AdminMetricCard
            label={t("admin.dashboard.kpi.openTickets")}
            value={pendingTickets.toLocaleString()}
            context={
              pendingTickets > 0 ? (
                <span className="font-medium text-rose-600 dark:text-rose-400">{t("admin.dashboard.kpi.awaitingReply")}</span>
              ) : (
                t("admin.dashboard.kpi.supportQueueClear")
              )
            }
            icon={Headphones}
            className="max-md:col-span-2 sm:col-span-2 lg:col-span-1"
          />
        </section>

        {/* Row 2: Admin Hero Welcome (Health Check) + Revenue Trend */}
        <div className="mt-4.5 grid gap-4.5 max-md:contents xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.85fr)]">
          <AdminHeroCard
            fullName={fullName}
            healthChecks={checks}
            onOpenHealthCheck={() => setIsHealthCheckOpen(true)}
          />
          <AdminRevenueTrend timeRange={timeRange} />
        </div>

        {/* Row 3: Production Overview */}
        <div className="mt-4.5 max-md:mt-0">
          <AdminOperationsRow operations={operations} isLoading={isOperationsLoading} />
        </div>

        {/* Row 4: Recent Activity */}
        <div className="mt-4.5 max-md:mt-0">
          <AdminActivityPanels
            latestTickets={metrics?.latestTickets}
            recentBatchJobs={metrics?.recentBatchJobs}
            totalBatchJobs={metrics?.totalBatchJobs}
          />
        </div>

        <footer className="border-ink-200 text-ink-400 mt-6 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[10px] max-md:hidden">
          <span>{t("admin.dashboard.footer.console")}</span>
          <span className="flex items-center gap-1">
            <Activity className="size-3" /> {t("admin.dashboard.footer.lastSynced")}
          </span>
        </footer>
      </div>

      {/* Health Check Drawer (Slide-over panel like Seller's ActionInbox) */}
      <AdminHealthCheckDrawer
        open={isHealthCheckOpen}
        onOpenChange={setIsHealthCheckOpen}
        healthChecks={checks}
      />
    </>
  );
};
