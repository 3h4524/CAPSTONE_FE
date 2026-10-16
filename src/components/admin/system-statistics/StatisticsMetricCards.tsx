"use client";

import React from "react";
import {
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
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
    subtitle: string,
    metric: MetricValueDto | undefined,
    icon: React.ReactNode
  ) => {
    if (isLoading || !metric) {
      return (
        <Card className="border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between pb-3">
            <div className="h-3.5 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-7 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-3 h-4 w-28 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </Card>
      );
    }

    const isPositive = metric.growthPercentage >= 0;

    return (
      <Card className="border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              {title}
            </span>
            <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
              {subtitle}
            </p>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white p-1.5 shadow-2xs transition-transform duration-200 hover:scale-105 dark:border-slate-700/80 dark:bg-slate-800">
            {icon}
          </div>
        </div>

        <div className="mt-4">
          <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {formatNumber(metric.value)}
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${
                isPositive
                  ? "border border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border border-rose-200/70 bg-rose-50 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300"
              }`}
            >
              {isPositive ? (
                <>
                  <TrendingUp className="mr-1 h-3 w-3" />
                  +{metric.growthPercentage}%
                </>
              ) : (
                <>
                  <TrendingDown className="mr-1 h-3 w-3" />
                  {metric.growthPercentage}%
                </>
              )}
            </span>
            <span className="text-[11px] text-slate-400">vs prev period</span>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {renderCard(
        "Total Batch Jobs",
        "Volume of processing runs",
        metrics?.totalBatchJobs,
        <img
          src="/icons/stat-batchjobs.png"
          alt="Total Batch Jobs"
          className="h-5 w-5 object-contain dark:brightness-200"
        />
      )}
      {renderCard(
        "Images Generated",
        "Visual creation requests",
        metrics?.imagesGenerated,
        <img
          src="/icons/stat-images.png"
          alt="Images Generated"
          className="h-5 w-5 object-contain"
        />
      )}
      {renderCard(
        "Videos Rendered",
        "Promo & marketing renders",
        metrics?.videosRendered,
        <img
          src="/icons/stat-videos.png"
          alt="Videos Rendered"
          className="h-5 w-5 object-contain"
        />
      )}
      {renderCard(
        "Listings Generated",
        "Catalog & SEO copies generated",
        metrics?.listingsGenerated,
        <img
          src="/icons/stat-listings.png"
          alt="Listings Generated"
          className="h-5 w-5 object-contain"
        />
      )}
    </div>
  );
}
