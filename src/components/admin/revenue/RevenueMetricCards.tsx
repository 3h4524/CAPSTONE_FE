"use client";

import React from "react";
import { CreditCard,DollarSign, TrendingUp, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MetricDetail,RevenueMetricsDto } from "@/types/revenue";

interface RevenueMetricCardsProps {
  metrics?: RevenueMetricsDto;
  isLoading: boolean;
}

export function RevenueMetricCards({ metrics, isLoading }: RevenueMetricCardsProps) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  const formatNumber = (val: number) => new Intl.NumberFormat("en-US").format(val);

  const renderMetric = (
    title: string,
    icon: React.ReactNode,
    metric: MetricDetail | undefined,
    isCurrency: boolean = true
  ) => {
    if (isLoading || !metric) {
      return (
        <Card className="overflow-hidden border-none bg-white shadow-sm dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
            {icon}
          </CardHeader>
          <CardContent>
            <div className="h-8 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div>
            <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800"></div>
          </CardContent>
        </Card>
      );
    }

    const isPositive = metric.percentageChange >= 0;

    return (
      <Card className="group overflow-hidden border-none bg-white shadow-sm transition-all hover:shadow-md dark:bg-slate-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="group-hover:text-primary text-sm font-medium text-slate-500 transition-colors">{title}</CardTitle>
          <div className="bg-primary/10 text-primary rounded-full p-2">{icon}</div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">
            {isCurrency ? formatCurrency(metric.value) : formatNumber(metric.value)}
          </div>
          <p
            className={`mt-1 text-xs font-medium ${
              isPositive ? "text-emerald-500" : "text-rose-500"
            }`}
          >
            {isPositive ? "+" : ""}
            {metric.percentageChange}% from previous period
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {renderMetric("Total Net Revenue", <DollarSign className="h-4 w-4" />, metrics?.totalNetRevenue)}
      {renderMetric("Subscription MRR", <TrendingUp className="h-4 w-4" />, metrics?.subscriptionMrr)}
      {renderMetric("Active Subscribers", <Users className="h-4 w-4" />, metrics?.activeSubscribers, false)}
      {renderMetric("ARPU", <CreditCard className="h-4 w-4" />, metrics?.arpu)}
    </div>
  );
}
