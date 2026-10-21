"use client";

import React from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Coins,
  HelpCircle,
  RefreshCw,
  RotateCcw,
  Users,
  Wallet,
} from "lucide-react";
import { Line, LineChart, ResponsiveContainer } from "recharts";

import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { MetricDetail, RevenueMetricsDto } from "@/types/revenue";
import { formatCurrency } from "@/utils/format-currency";

interface RevenueMetricCardsProps {
  metrics?: RevenueMetricsDto;
  isLoading: boolean;
  currency?: "VND" | "USD";
}

interface CardConfig {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  strokeColor: string;
  metric?: MetricDetail;
  isCurrency: boolean;
  invertTrend?: boolean; // For refunds, an increase can be considered warning
  tooltip: string;
}

export function RevenueMetricCards({
  metrics,
  isLoading,
  currency = "VND",
}: RevenueMetricCardsProps) {
  const cards: CardConfig[] = [
    {
      title: "Total Revenue",
      icon: <Coins className="h-4 w-4" />,
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      iconColor: "text-blue-600 dark:text-blue-400",
      strokeColor: "#3b82f6",
      metric: metrics?.totalRevenue,
      isCurrency: true,
      tooltip: "Tổng doanh thu gộp thu được từ tất cả hóa đơn thanh toán thành công trong kỳ đã chọn.",
    },
    {
      title: "Net Revenue",
      icon: <Wallet className="h-4 w-4" />,
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      strokeColor: "#10b981",
      metric: metrics?.netRevenue ?? metrics?.totalNetRevenue,
      isCurrency: true,
      tooltip: "Doanh thu thuần thực nhận sau khi khấu trừ các khoản hoàn tiền (Gross Revenue - Refunds).",
    },
    {
      title: "MRR",
      icon: <RefreshCw className="h-4 w-4" />,
      iconBg: "bg-indigo-50 dark:bg-indigo-950/40",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      strokeColor: "#6366f1",
      metric: metrics?.subscriptionMrr,
      isCurrency: true,
      tooltip: "Monthly Recurring Revenue: Doanh thu định kỳ hàng tháng từ các gói thuê bao (Subscription) đang hoạt động.",
    },
    {
      title: "ARR",
      icon: <Calendar className="h-4 w-4" />,
      iconBg: "bg-amber-50 dark:bg-amber-950/40",
      iconColor: "text-amber-600 dark:text-amber-400",
      strokeColor: "#f59e0b",
      metric: metrics?.arr,
      isCurrency: true,
      tooltip: "Annual Recurring Revenue: Doanh thu định kỳ hàng năm dự phóng theo quy chuẩn tài chính SaaS (MRR × 12 tháng).",
    },
    {
      title: "Active Subscribers",
      icon: <Users className="h-4 w-4" />,
      iconBg: "bg-teal-50 dark:bg-teal-950/40",
      iconColor: "text-teal-600 dark:text-teal-400",
      strokeColor: "#14b8a6",
      metric: metrics?.activeSubscribers,
      isCurrency: false,
      tooltip: "Số lượng khách hàng đang có gói thuê bao hoạt động trong kỳ đã chọn.",
    },
    {
      title: "Refund Amount",
      icon: <RotateCcw className="h-4 w-4" />,
      iconBg: "bg-rose-50 dark:bg-rose-950/40",
      iconColor: "text-rose-600 dark:text-rose-400",
      strokeColor: "#f43f5e",
      metric: metrics?.refundAmount,
      isCurrency: true,
      invertTrend: true,
      tooltip: "Tổng số tiền đã hoàn trả cho khách hàng trong kỳ đã chọn.",
    },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {cards.map((config) => {
          const metric = config.metric;

          if (isLoading || !metric) {
            return (
              <Card
                key={config.title}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                <CardContent className="flex flex-col justify-between p-0">
                  <div className="flex items-center justify-between">
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                    <div className="h-6 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  </div>
                  <div className="mt-4 h-7 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="mt-2 h-4 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                </CardContent>
              </Card>
            );
          }

          const isPositive = metric.percentageChange >= 0;
          const trendIsGood = config.invertTrend ? !isPositive : isPositive;

          // Sparkline points
          const rawPoints =
            metric.sparkline && metric.sparkline.length > 0
              ? metric.sparkline
              : [
                  metric.previousValue,
                  metric.previousValue * 1.02,
                  metric.previousValue * 0.98,
                  metric.value * 0.97,
                  metric.value * 1.01,
                  metric.value,
                ];

          const sparklineData = rawPoints.map((val, idx) => ({
            i: idx,
            v: Number(val),
          }));

          const formattedValue = config.isCurrency
            ? formatCurrency(metric.value, currency)
            : new Intl.NumberFormat("en-US").format(metric.value);

          const formattedPrevValue = config.isCurrency
            ? formatCurrency(metric.previousValue, currency)
            : new Intl.NumberFormat("en-US").format(metric.previousValue);

          return (
            <Card
              key={config.title}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all duration-200 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <CardContent className="flex flex-col justify-between p-0">
                {/* Header: Icon + Title with Tooltip on left, Sparkline on right */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.iconBg} ${config.iconColor}`}
                    >
                      {config.icon}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="group/title flex cursor-help items-center gap-1">
                          <span className="text-xs font-semibold tracking-tight text-slate-600 transition-colors group-hover/title:text-slate-900 dark:text-slate-300 dark:group-hover/title:text-slate-100">
                            {config.title}
                          </span>
                          <HelpCircle className="h-3 w-3 text-slate-400 opacity-60 transition-opacity group-hover/title:opacity-100 dark:text-slate-500" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs font-normal">
                        {config.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Mini Sparkline */}
                  <div className="h-7 w-16 shrink-0 opacity-90 transition-opacity group-hover:opacity-100">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={sparklineData}>
                        <Line
                          type="monotone"
                          dataKey="v"
                          stroke={config.strokeColor}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Main Metric Value */}
                <div className="mt-3">
                  <div className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
                    {formattedValue}
                  </div>
                </div>

                {/* Trend % + Comparison */}
                <div className="mt-2 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1 text-xs">
                    <span
                      className={`inline-flex items-center font-bold ${
                        trendIsGood ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isPositive ? (
                        <ArrowUpRight className="mr-0.5 h-3.5 w-3.5 stroke-[2.5]" />
                      ) : (
                        <ArrowDownRight className="mr-0.5 h-3.5 w-3.5 stroke-[2.5]" />
                      )}
                      {Math.abs(metric.percentageChange).toFixed(1)}%
                    </span>
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      vs. previous period
                    </span>
                  </div>

                  <p className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                    Previous period: <span className="font-medium text-slate-500 dark:text-slate-400">{formattedPrevValue}</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
