"use client";

import React from "react";
import {
  Clapperboard,
  Image as ImageIcon,
  Layers,
  Tag,
} from "lucide-react";

import { AdminMetricCard, Delta } from "@/components/admin/admin-metric-card";
import type {
  DailyJobsPointDto,
  StatisticsMetricCardsDto,
} from "@/types/system-statistics";

interface StatisticsMetricCardsProps {
  metrics?: StatisticsMetricCardsDto;
  isLoading: boolean;
  comparisonLabel: string;
  dailyJobs?: DailyJobsPointDto[];
}

const DEFAULT_SPARKLINES = {
  images: [8, 12, 10, 18, 15, 24, 20, 28, 22, 35, 30, 42],
  videos: [2, 3, 2, 5, 4, 8, 6, 9, 7, 12, 10, 15],
  listings: [1, 1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 8],
};

export function StatisticsMetricCards({
  metrics,
  isLoading,
  comparisonLabel,
  dailyJobs = [],
}: StatisticsMetricCardsProps) {
  const jobPoints =
    dailyJobs.length > 1
      ? dailyJobs.map((d) => d.count)
      : [3, 5, 2, 8, 4, 6, 9, 5, 12];

  if (isLoading || !metrics) {
    return (
      <div className="mb-4.5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border-ink-200/80 bg-card flex flex-col justify-between rounded-xl border p-3.5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="bg-ink-100 h-3 w-16 animate-pulse rounded" />
              <div className="bg-ink-100 h-3.5 w-3.5 animate-pulse rounded" />
            </div>
            <div className="bg-ink-100 my-2 h-6 w-20 animate-pulse rounded" />
            <div className="bg-ink-100 h-2.5 w-28 animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="mb-4.5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {/* 1. Batch jobs */}
      <AdminMetricCard
        label="Batch jobs"
        value={metrics.totalBatchJobs.value.toLocaleString()}
        context={
          <Delta
            percent={metrics.totalBatchJobs.growthPercentage}
            suffix={comparisonLabel}
          />
        }
        sparkline={jobPoints}
        icon={Layers}
      />

      {/* 2. Images generated */}
      <AdminMetricCard
        label="Images generated"
        value={metrics.imagesGenerated.value.toLocaleString()}
        context={
          <Delta
            percent={metrics.imagesGenerated.growthPercentage}
            suffix={comparisonLabel}
          />
        }
        sparkline={DEFAULT_SPARKLINES.images}
        icon={ImageIcon}
      />

      {/* 3. Videos rendered */}
      <AdminMetricCard
        label="Videos rendered"
        value={metrics.videosRendered.value.toLocaleString()}
        context={
          <Delta
            percent={metrics.videosRendered.growthPercentage}
            suffix={comparisonLabel}
          />
        }
        sparkline={DEFAULT_SPARKLINES.videos}
        icon={Clapperboard}
      />

      {/* 4. Listings generated */}
      <AdminMetricCard
        label="Listings generated"
        value={metrics.listingsGenerated.value.toLocaleString()}
        context={
          <Delta
            percent={metrics.listingsGenerated.growthPercentage}
            suffix={comparisonLabel}
          />
        }
        sparkline={DEFAULT_SPARKLINES.listings}
        icon={Tag}
      />
    </section>
  );
}
