"use client";

import { useState } from "react";
import {
  Activity,
  BriefcaseBusiness,
  CircleHelp,
  DollarSign,
  Plus,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { AdminActivityPanels } from "@/components/admin/admin-activity-panels";
import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { AdminRevenueChart } from "@/components/admin/admin-revenue-chart";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { Button } from "@/components/ui/button";

type AdminDashboardShellProps = {
  fullName: string;
  onLogout: () => void;
};

const AdminDashboardShell = ({ fullName, onLogout }: AdminDashboardShellProps) => (
  <AdminDashboardContent fullName={fullName} onLogout={onLogout} />
);

const AdminDashboardContent = ({ fullName, onLogout }: AdminDashboardShellProps) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <div className="flex min-h-screen">
        <AdminSidebar
          fullName={fullName}
          onLogout={onLogout}
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />
        <div className="min-w-0 flex-1">
          <AdminTopbar fullName={fullName} onMenuClick={() => setIsMobileSidebarOpen(true)} />
          <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Platform overview
                </p>
                <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                  Admin Dashboard
                </h1>
                <p className="mt-1 text-xs text-slate-400">
                  Platform overview, live telemetry, and administrative shortcuts in one calm place.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8 rounded-md px-3 text-[10px]">
                  <RefreshCw className="size-3" /> Sync Live Stats
                </Button>
                <Button size="sm" className="h-8 rounded-md px-3 text-[10px]">
                  <Plus className="size-3" /> New Batch
                </Button>
              </div>
            </div>

            <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminMetricCard
                label="Total Users"
                value="1,247"
                change="+12.4%"
                trend="up"
                note="+34 this week · 892 paid active"
                icon={UserRound}
              />
              <AdminMetricCard
                label="Total Revenue (Monthly)"
                value="$45,880"
                change="+18.2%"
                trend="up"
                note="MRR: $38,400 · Quick Export"
                icon={DollarSign}
              />
              <AdminMetricCard
                label="Active Batch Jobs"
                value="24"
                change="Rendering"
                trend="up"
                note="Leonardo API · 3,420 queued"
                icon={BriefcaseBusiness}
              />
              <AdminMetricCard
                label="Pending Tickets"
                value="7"
                change="urgent"
                trend="down"
                note="Avg response: 18m · View queue"
                icon={CircleHelp}
              />
            </section>

            <div className="mt-5">
              <AdminRevenueChart />
            </div>
            <div className="mt-5">
              <AdminActivityPanels />
            </div>
            <p className="mt-8 flex items-center justify-center gap-1 text-[10px] text-slate-400">
              <Activity className="size-3" /> Last synced just now
            </p>
          </main>
        </div>
      </div>
    </div>
  );
};

export { AdminDashboardShell };
