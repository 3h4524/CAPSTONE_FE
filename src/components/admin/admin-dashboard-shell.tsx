"use client";

import { useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CircleHelp,
  DollarSign,
  Download,
  UserRound,
} from "lucide-react";

import { AdminActivityPanels } from "@/components/admin/admin-activity-panels";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminRevenueChart } from "@/components/admin/admin-revenue-chart";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { Button } from "@/components/ui/button";
import type { AdminDashboardMetricsDto } from "@/types/admin";
import { formatCurrencyVnd } from "@/utils/format-currency";

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

const AdminDashboardContent = ({ fullName, onLogout, metrics, timeRange, onTimeRangeChange, isExporting, onExport }: AdminDashboardShellProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
      <div className="flex h-screen">
        <AdminSidebar
          fullName={fullName}
          onLogout={onLogout}
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
        />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="h-screen overflow-y-auto">
            <AdminTopbar fullName={fullName} onMenuClick={() => setIsMobileSidebarOpen(true)} />
            <main className="mx-auto max-w-[1600px] px-4 py-4 sm:px-[calc(1.5rem+1cm)] sm:py-5 2xl:max-w-[1720px]">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
                    Platform overview
                  </p>
                  <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                    Admin Dashboard
                  </h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Platform overview, live telemetry, and administrative shortcuts in one calm
                    place.
                  </p>
                </div>
                <div className="flex items-center justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 rounded-md px-3 text-[10px]"
                    onClick={onExport}
                    disabled={isExporting}
                  >
                    <Download className="size-3" /> {isExporting ? "Exporting..." : "Export Report"}
                  </Button>
                </div>
              </div>

              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <AdminMetricCard
                  label="Total Users"
                  value={metrics?.totalUsers.toLocaleString() ?? "-"}
                  change=""
                  trend="up"
                  note={`${metrics?.activePaidUsers.toLocaleString() ?? 0} paid active`}
                  icon={UserRound}
                />
                <AdminMetricCard
                  label={`Total Revenue (${timeRange})`}
                  value={metrics ? formatCurrencyVnd(metrics.totalRevenue) : "0 ₫"}
                  change=""
                  trend="up"
                  note={`MRR: ${metrics ? formatCurrencyVnd(metrics.recurringRevenue) : "0 ₫"}`}
                  icon={DollarSign}
                />
                <AdminMetricCard
                  label="Total Batch Jobs"
                  value={metrics ? (metrics.totalBatchJobs ?? 0).toLocaleString() : "-"}
                  change=""
                  trend="up"
                  note={`${metrics?.activeBatchJobs ?? 0} active in queue`}
                  icon={BriefcaseBusiness}
                />
                <AdminMetricCard
                  label="Pending Tickets"
                  value={metrics?.pendingTickets.toLocaleString() ?? "-"}
                  change=""
                  trend="down"
                  note="Requires attention"
                  icon={CircleHelp}
                />
              </section>

              <div className="mt-5">
                <AdminRevenueChart 
                  revenueChart={metrics?.revenueChart} 
                  timeRange={timeRange} 
                  onTimeRangeChange={onTimeRangeChange} 
                />
              </div>
              <div className="mt-5">
                <AdminActivityPanels latestTickets={metrics?.latestTickets} recentBatchJobs={metrics?.recentBatchJobs} />
              </div>
              <p className="mt-8 flex items-center justify-center gap-1 text-[10px] text-slate-400">
                <Activity className="size-3" /> Last synced just now
              </p>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

export { AdminDashboardShell };
