"use client";

import React from "react";
import {
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import type {
  MetricValueDto,
  StatisticsMetricCardsDto,
} from "@/types/system-statistics";

interface StatisticsMetricCardsProps {
  metrics?: StatisticsMetricCardsDto;
  isLoading: boolean;
}

export function StatisticsMetricCards({
  metrics,
  isLoading,
}: StatisticsMetricCardsProps) {
  const formatNumber = (val: number) => new Intl.NumberFormat("en-US").format(val);

  const renderCard = (
    title: string,
    metric: MetricValueDto | undefined,
    icon: React.ReactNode,
    circleColor: string
  ) => {
    if (isLoading || !metric) {
      return (
        <div className="flex flex-row items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          <div className="flex-1 space-y-2">
            <div className="h-5 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3.5 w-28 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      );
    }

    const isPositive = metric.growthPercentage >= 0;

    return (
      <div className="flex flex-row items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        {/* Left: Circular Icon Badge */}
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 ${circleColor}`}
        >
          {icon}
        </div>

        {/* Right: Number on top, Title below */}
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              {formatNumber(metric.value)}
            </span>
            <span
              className={`inline-flex items-center text-xs font-semibold ${
                isPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isPositive ? (
                <>
                  <TrendingUp className="mr-0.5 h-3.5 w-3.5 stroke-[2.5]" />
                  +{metric.growthPercentage}%
                </>
              ) : (
                <>
                  <TrendingDown className="mr-0.5 h-3.5 w-3.5 stroke-[2.5]" />
                  {metric.growthPercentage}%
                </>
              )}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {title}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {renderCard(
        "Total Batch Jobs",
        metrics?.totalBatchJobs,
        <img
          src="/icons/stat-batchjobs.png"
          alt="Total Batch Jobs"
          className="h-6 w-6 object-contain dark:brightness-200"
        />,
        "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
      )}
      {renderCard(
        "Images Generated",
        metrics?.imagesGenerated,
        <img
          src="/icons/stat-images.png"
          alt="Images Generated"
          className="h-6 w-6 object-contain"
        />,
        "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
      )}
      {renderCard(
        "Videos Rendered",
        metrics?.videosRendered,
        <img
          src="/icons/stat-videos.png"
          alt="Videos Rendered"
          className="h-6 w-6 object-contain"
        />,
        "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400"
      )}
      {renderCard(
        "Listings Generated",
        metrics?.listingsGenerated,
        <img
          src="/icons/stat-listings.png"
          alt="Listings Generated"
          className="h-6 w-6 object-contain"
        />,
        "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"
      )}
    </div>
  );
}
