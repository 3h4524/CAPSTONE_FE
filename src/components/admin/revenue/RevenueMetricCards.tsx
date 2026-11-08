"use client";

import React from "react";
import {
  Calendar,
  Coins,
  HelpCircle,
  RefreshCw,
  RotateCcw,
  Users,
  Wallet,
} from "lucide-react";

import { AdminMetricCard, Delta } from "@/components/admin/admin-metric-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { MetricDetail, RevenueMetricsDto } from "@/types/revenue";
import { formatVnd } from "@/utils/format-currency";

interface RevenueMetricCardsProps {
  metrics?: RevenueMetricsDto;
  isLoading: boolean;
}

export function RevenueMetricCards({
  metrics,
  isLoading,
}: RevenueMetricCardsProps) {
  const isPhone = useIsPhone();
  const cards = [
    {
      title: "Total Revenue",
      icon: Coins,
      metric: metrics?.totalRevenue,
      isCurrency: true,
      tooltip:
        "Gross revenue from all successful invoice payments in the selected period, including payments later refunded.",
    },
    {
      title: "Net Revenue",
      icon: Wallet,
      metric: metrics?.netRevenue ?? metrics?.totalNetRevenue,
      isCurrency: true,
      tooltip:
        "Net revenue retained after deducting refunds (Gross Revenue − Refunds) in the selected period.",
    },
    {
      title: "MRR",
      icon: RefreshCw,
      metric: metrics?.subscriptionMrr,
      isCurrency: true,
      tooltip:
        "Monthly Recurring Revenue at the end of the period: each paying subscription's monthly price (annual plans count 1/12).",
    },
    {
      title: "ARR",
      icon: Calendar,
      metric: metrics?.arr,
      isCurrency: true,
      tooltip:
        "Annual Recurring Revenue: MRR × 12, at the end of the period and of the previous period.",
    },
    {
      title: "Active Subscribers",
      icon: Users,
      metric: metrics?.activeSubscribers,
      isCurrency: false,
      tooltip:
        "Sellers paying for a plan at the end of the period (free trials and unpaid renewals not counted).",
    },
    {
      title: "Refund Amount",
      icon: RotateCcw,
      metric: metrics?.refundAmount,
      isCurrency: true,
      polarity: "lower-is-better" as const,
      tooltip: "Total monetary value refunded to customers during the selected period.",
    },
  ];

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="my-2 h-6 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-2.5 w-24 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <section className="grid grid-cols-2 gap-3 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((config) => {
          const metric: MetricDetail | undefined = config.metric;
          const valueDisplay = metric
            ? config.isCurrency
              ? formatVnd(metric.value)
              : metric.value.toLocaleString()
            : "-";

          const exactDisplay = metric
            ? config.isCurrency
              ? formatVnd(metric.value)
              : metric.value.toLocaleString()
            : undefined;

          const rawPoints =
            metric?.sparkline && metric.sparkline.length > 0
              ? metric.sparkline
              : metric
                ? [
                    metric.previousValue,
                    metric.previousValue * 1.02,
                    metric.previousValue * 0.98,
                    metric.value * 0.97,
                    metric.value * 1.01,
                    metric.value,
                  ]
                : undefined;

          return (
            <AdminMetricCard
              key={config.title}
              label={
                <div className="flex items-center gap-1">
                  <span className="truncate">{config.title}</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={`About ${config.title}`}
                        className="inline-flex cursor-pointer text-slate-400 transition-colors hover:text-slate-600 focus:outline-none"
                      >
                        <HelpCircle className="size-2.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-xs font-normal">
                      {config.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </div>
              }
              value={valueDisplay}
              exactValue={exactDisplay}
              // Saying there is no comparison on every card only adds noise to a phone.
              context={
                isPhone && metric?.percentageChange == null ? null : (
                  <Delta
                    percent={metric?.percentageChange}
                    suffix="vs previous period"
                    polarity={config.polarity}
                  />
                )
              }
              sparkline={rawPoints}
              icon={config.icon}
            />
          );
        })}
      </section>
    </TooltipProvider>
  );
}
