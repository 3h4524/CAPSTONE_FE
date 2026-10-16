"use client";

import React from "react";
import {
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { IntegrationStatusDto } from "@/types/system-statistics";

interface IntegrationHealthCardsProps {
  integrationStatus?: IntegrationStatusDto;
  isLoading: boolean;
}

export function IntegrationHealthCards({
  integrationStatus,
  isLoading,
}: IntegrationHealthCardsProps) {
  if (isLoading || !integrationStatus) {
    return (
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card
            key={i}
            className="border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                <div className="h-3.5 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="h-2 w-2 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-7 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-4 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </Card>
        ))}
      </div>
    );
  }

  const renderStatusDot = (rate: number, total: number) => {
    if (total === 0) {
      return (
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
          Inactive
        </span>
      );
    }
    if (rate >= 95) {
      return (
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Healthy
        </span>
      );
    }
    if (rate >= 80) {
      return (
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Degraded
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Critical
      </span>
    );
  };

  const renderGrowth = (growth: number, total: number) => {
    if (total === 0 && growth === 0) {
      return <span className="text-slate-400">0% vs prev</span>;
    }
    if (growth >= 0) {
      return (
        <span className="inline-flex items-center font-medium text-emerald-600 dark:text-emerald-400">
          <TrendingUp className="mr-0.5 h-3 w-3" />
          +{growth}% vs prev
        </span>
      );
    }
    return (
      <span className="inline-flex items-center font-medium text-rose-600 dark:text-rose-400">
        <TrendingDown className="mr-0.5 h-3 w-3" />
        {growth}% vs prev
      </span>
    );
  };

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Etsy Integration */}
      <Card className="border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white p-1 shadow-2xs transition-transform duration-200 hover:scale-105 dark:border-slate-700/80 dark:bg-slate-800">
              <img
                src="/icons/stat-etsy.png"
                alt="Etsy Sync"
                className="h-5 w-5 object-contain"
              />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Etsy Sync
            </span>
          </div>
          {renderStatusDot(
            integrationStatus.etsySuccessRate,
            integrationStatus.etsyTotal
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {integrationStatus.etsyTotal.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">uploads</span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100/90 pt-2.5 text-[11px] dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">
            {integrationStatus.etsyTotal > 0
              ? `${integrationStatus.etsySuccessRate.toFixed(1)}% success`
              : "No activity yet"}
          </span>
          {renderGrowth(
            integrationStatus.etsyGrowthPercentage,
            integrationStatus.etsyTotal
          )}
        </div>
      </Card>

      {/* Printify Integration */}
      <Card className="border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white p-1 shadow-2xs transition-transform duration-200 hover:scale-105 dark:border-slate-700/80 dark:bg-slate-800">
              <img
                src="/icons/stat-printify.png"
                alt="Printify Sync"
                className="h-5 w-5 object-contain rounded-sm"
              />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Printify Sync
            </span>
          </div>
          {renderStatusDot(
            integrationStatus.printifySuccessRate,
            integrationStatus.printifyTotal
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {integrationStatus.printifyTotal.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">uploads</span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100/90 pt-2.5 text-[11px] dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">
            {integrationStatus.printifyTotal > 0
              ? `${integrationStatus.printifySuccessRate.toFixed(1)}% success`
              : "No activity yet"}
          </span>
          {renderGrowth(
            integrationStatus.printifyGrowthPercentage,
            integrationStatus.printifyTotal
          )}
        </div>
      </Card>

      {/* Social Media Channels */}
      <Card className="border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white p-1.5 shadow-2xs transition-transform duration-200 hover:scale-105 dark:border-slate-700/80 dark:bg-slate-800">
              <img
                src="/icons/stat-social.png"
                alt="Social Media"
                className="h-5 w-5 object-contain"
              />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Social Media
            </span>
          </div>
          {renderStatusDot(
            integrationStatus.socialMediaSuccessRate,
            integrationStatus.socialMediaTotal
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {integrationStatus.socialMediaTotal.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">shares</span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100/90 pt-2.5 text-[11px] dark:border-slate-800/80">
          <span className="text-slate-500 dark:text-slate-400">
            {integrationStatus.socialMediaTotal > 0
              ? `${integrationStatus.socialMediaSuccessRate.toFixed(1)}% success`
              : "No activity yet"}
          </span>
          {renderGrowth(
            integrationStatus.socialMediaGrowthPercentage,
            integrationStatus.socialMediaTotal
          )}
        </div>
      </Card>

      {/* Failed Integrations */}
      <Card className="border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/90 bg-white p-1.5 shadow-2xs transition-transform duration-200 hover:scale-105 dark:border-slate-700/80 dark:bg-slate-800">
              <img
                src="/icons/stat-error.png"
                alt="Sync Errors"
                className="h-5 w-5 object-contain"
              />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Sync Errors
            </span>
          </div>
          <span
            className={`flex items-center gap-1.5 text-[11px] font-medium ${
              integrationStatus.failedIntegrationsCount > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-slate-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                integrationStatus.failedIntegrationsCount > 0
                  ? "bg-rose-500"
                  : "bg-emerald-500"
              }`}
            />
            {integrationStatus.failedIntegrationsCount > 0
              ? "Errors logged"
              : "Zero errors"}
          </span>
        </div>

        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {integrationStatus.failedIntegrationsCount.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400">failed calls</span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100/90 pt-2.5 text-[11px] text-slate-400 dark:border-slate-800/80">
          <span>
            {integrationStatus.failedIntegrationsCount > 0
              ? "Requires channel review"
              : "All endpoints operational"}
          </span>
        </div>
      </Card>
    </div>
  );
}
