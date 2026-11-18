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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("common");
  const cards = [
    {
      title: t("admin.revenue.metricCards.totalRevenue"),
      icon: Coins,
      metric: metrics?.totalRevenue,
      isCurrency: true,
      tooltip: t("admin.revenue.metricCards.totalRevenueHelp"),
    },
    {
      title: t("admin.revenue.metricCards.netRevenue"),
      icon: Wallet,
      metric: metrics?.netRevenue ?? metrics?.totalNetRevenue,
      isCurrency: true,
      tooltip: t("admin.revenue.metricCards.netRevenueHelp"),
    },
    {
      title: t("admin.revenue.metricCards.mrr"),
      icon: RefreshCw,
      metric: metrics?.subscriptionMrr,
      isCurrency: true,
      tooltip: t("admin.revenue.metricCards.mrrHelp"),
    },
    {
      title: t("admin.revenue.metricCards.arr"),
      icon: Calendar,
      metric: metrics?.arr,
      isCurrency: true,
      tooltip: t("admin.revenue.metricCards.arrHelp"),
    },
    {
      title: t("admin.revenue.metricCards.activeSubscribers"),
      icon: Users,
      metric: metrics?.activeSubscribers,
      isCurrency: false,
      tooltip: t("admin.revenue.metricCards.activeSubscribersHelp"),
    },
    {
      title: t("admin.revenue.metricCards.refundAmount"),
      icon: RotateCcw,
      metric: metrics?.refundAmount,
      isCurrency: true,
      polarity: "lower-is-better" as const,
      tooltip: t("admin.revenue.metricCards.refundAmountHelp"),
    },
  ];

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="border-ink-200/80 bg-card flex flex-col justify-between rounded-xl border p-3.5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="bg-ink-100 h-3 w-16 animate-pulse rounded" />
              <div className="bg-ink-100 h-3.5 w-3.5 animate-pulse rounded" />
            </div>
            <div className="bg-ink-100 my-2 h-6 w-20 animate-pulse rounded" />
            <div className="bg-ink-100 h-2.5 w-24 animate-pulse rounded" />
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
                        aria-label={t("admin.revenue.metricCards.about", { title: config.title })}
                        className="phone-hit-area text-ink-400 hover:text-ink-600 inline-flex cursor-pointer transition-colors focus:outline-none"
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
                    suffix={t("admin.revenue.common.vsPreviousPeriod")}
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
