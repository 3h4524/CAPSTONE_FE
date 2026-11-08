"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { RevenueTrendCard } from "@/components/admin/revenue/RevenueTrendCard";
import { dashboardTrendFilter } from "@/helpers/revenue-trend";
import { useRevenueCharts } from "@/hooks/queries/use-revenue";

type AdminRevenueTrendProps = {
  /** The Dashboard's range, picked in its header. */
  timeRange: string;
};

/** The Revenue page's trend card on the Dashboard, following the Dashboard's range. */
const AdminRevenueTrend = ({ timeRange }: AdminRevenueTrendProps) => {
  const filter = useMemo(() => dashboardTrendFilter(timeRange), [timeRange]);
  const { data, isLoading } = useRevenueCharts(filter);

  return (
    <RevenueTrendCard
      trend={data?.trend}
      isLoading={isLoading}
      filter={filter}
      actions={
        <Link
          href="/admin/revenue"
          className="flex items-center gap-0.5 text-[11px] font-semibold text-ink-500 hover:text-ink-900 dark:text-slate-400 dark:hover:text-slate-100"
        >
          Revenue report <ArrowUpRight className="size-3" />
        </Link>
      }
    />
  );
};

export { AdminRevenueTrend };
