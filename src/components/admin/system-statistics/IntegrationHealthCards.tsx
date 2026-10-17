"use client";

import React from "react";

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
          <div
            key={i}
            className="flex flex-row items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
              <div className="space-y-2">
                <div className="h-5 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3.5 w-24 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              </div>
            </div>
            <div className="h-5 w-14 self-start animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  const renderStatusBadge = (rate: number, total: number) => {
    if (total === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Inactive
        </span>
      );
    }
    if (rate >= 95) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {rate.toFixed(1)}%
        </span>
      );
    }
    if (rate >= 80) {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          {rate.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        {rate.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Etsy Integration */}
      <div className="flex flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        {/* Left: Circular Logo & Stats */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400">
            <img
              src="/icons/stat-etsy.png"
              alt="Etsy Sync"
              className="h-6 w-6 object-contain"
            />
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <span className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              {integrationStatus.etsyTotal.toLocaleString()}
            </span>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              Etsy Marketplace
            </p>
          </div>
        </div>

        {/* Right: Status Badge */}
        <div className="shrink-0 self-start pt-0.5">
          {renderStatusBadge(
            integrationStatus.etsySuccessRate,
            integrationStatus.etsyTotal
          )}
        </div>
      </div>

      {/* Printify Integration */}
      <div className="flex flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        {/* Left: Circular Logo & Stats */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <img
              src="/icons/stat-printify.png"
              alt="Printify Sync"
              className="h-6 w-6 object-contain"
            />
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <span className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              {integrationStatus.printifyTotal.toLocaleString()}
            </span>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              Printify Fulfillment
            </p>
          </div>
        </div>

        {/* Right: Status Badge */}
        <div className="shrink-0 self-start pt-0.5">
          {renderStatusBadge(
            integrationStatus.printifySuccessRate,
            integrationStatus.printifyTotal
          )}
        </div>
      </div>

      {/* Social Media Channels */}
      <div className="flex flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        {/* Left: Circular Logo & Stats */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <img
              src="/icons/stat-social.png"
              alt="Social Media"
              className="h-6 w-6 object-contain"
            />
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <span className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              {integrationStatus.socialMediaTotal.toLocaleString()}
            </span>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              Social Media Shares
            </p>
          </div>
        </div>

        {/* Right: Status Badge */}
        <div className="shrink-0 self-start pt-0.5">
          {renderStatusBadge(
            integrationStatus.socialMediaSuccessRate,
            integrationStatus.socialMediaTotal
          )}
        </div>
      </div>

      {/* Sync Incidents */}
      <div className="flex flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
        {/* Left: Circular Logo & Stats */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <img
              src="/icons/stat-error.png"
              alt="Sync Incidents"
              className="h-6 w-6 object-contain"
            />
          </div>

          <div className="flex min-w-0 flex-col justify-center">
            <span
              className={`text-xl font-bold tracking-tight sm:text-2xl ${
                integrationStatus.failedIntegrationsCount > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {integrationStatus.failedIntegrationsCount}
            </span>
            <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              Sync Incidents
            </p>
          </div>
        </div>

        {/* Right: Status Badge */}
        <div className="shrink-0 self-start pt-0.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              integrationStatus.failedIntegrationsCount > 0
                ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                integrationStatus.failedIntegrationsCount > 0
                  ? "bg-rose-500 animate-pulse"
                  : "bg-emerald-500"
              }`}
            />
            {integrationStatus.failedIntegrationsCount > 0 ? "Action Req" : "Optimal"}
          </span>
        </div>
      </div>
    </div>
  );
}
