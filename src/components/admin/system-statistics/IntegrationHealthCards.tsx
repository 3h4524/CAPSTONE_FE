"use client";

import React from "react";
import { AlertTriangle, Plug, Share2 } from "lucide-react";

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
      <div className="border-ink-200/80 bg-card flex h-full flex-col justify-between rounded-2xl border p-5 shadow-2xs max-md:p-4">
        <div className="border-ink-100 flex items-center gap-3 border-b pb-3">
          <div className="bg-ink-100 h-9 w-9 animate-pulse rounded-lg" />
          <div className="space-y-1.5">
            <div className="bg-ink-100 h-4 w-28 animate-pulse rounded" />
            <div className="bg-ink-100 h-3 w-48 animate-pulse rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-ink-100 h-20 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const renderStatusBadge = (rate: number, total: number) => {
    if (total === 0) {
      return (
        <span className="text-ink-500 inline-flex items-center gap-1.5 text-[11px] font-medium">
          <span className="bg-ink-400 h-1.5 w-1.5 rounded-full" />
          Inactive
        </span>
      );
    }
    if (rate >= 95) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {rate.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        {rate.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="border-ink-200/80 bg-card flex h-full flex-col justify-between rounded-2xl border p-5 shadow-2xs max-md:p-4">
      {/* Header */}
      <div className="border-ink-100 flex items-center gap-3 border-b pb-3">
        <div className="bg-ink-100 text-ink-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          <Plug className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-ink-900 text-sm font-bold">Integrations</h3>
          <p className="text-ink-500 text-xs">
            Uploads and shares sent to Etsy, Printify and social channels
          </p>
        </div>
      </div>

      {/* 2x2 Grid of Channels */}
      <div className="grid grid-cols-1 gap-3 pt-3 max-[359px]:grid-cols-1 max-md:grid-cols-2 max-md:gap-2 sm:grid-cols-2">
        {/* Etsy */}
        <div className="border-ink-200/80 bg-ink-50/70 hover:bg-ink-50 flex items-center justify-between gap-2 rounded-xl border p-3.5 transition-all max-md:flex-wrap max-md:p-2.5">
          <div className="flex min-w-0 items-center gap-2.5 max-md:gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-[10px] font-bold text-white shadow-2xs">
              Etsy
            </div>
            <span className="text-ink-800 text-xs font-semibold">
              Etsy Marketplace
            </span>
          </div>
          <div className="min-w-0 text-right">
            <span className="text-ink-900 text-sm font-bold">
              {integrationStatus.etsyTotal.toLocaleString()}
            </span>
            <div>
              {renderStatusBadge(
                integrationStatus.etsySuccessRate,
                integrationStatus.etsyTotal
              )}
            </div>
          </div>
        </div>

        {/* Printify */}
        <div className="border-ink-200/80 bg-ink-50/70 hover:bg-ink-50 flex items-center justify-between gap-2 rounded-xl border p-3.5 transition-all max-md:flex-wrap max-md:p-2.5">
          <div className="flex min-w-0 items-center gap-2.5 max-md:gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#22c55e] text-[11px] font-bold text-white shadow-2xs">
              P
            </div>
            <span className="text-ink-800 text-xs font-semibold">
              Printify Fulfillment
            </span>
          </div>
          <div className="min-w-0 text-right">
            <span className="text-ink-900 text-sm font-bold">
              {integrationStatus.printifyTotal.toLocaleString()}
            </span>
            <div>
              {renderStatusBadge(
                integrationStatus.printifySuccessRate,
                integrationStatus.printifyTotal
              )}
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="border-ink-200/80 bg-ink-50/70 hover:bg-ink-50 flex items-center justify-between gap-2 rounded-xl border p-3.5 transition-all max-md:flex-wrap max-md:p-2.5">
          <div className="flex min-w-0 items-center gap-2.5 max-md:gap-2">
            <div className="bg-ink-200/80 text-ink-700 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <Share2 className="h-4 w-4" />
            </div>
            <span className="text-ink-800 text-xs font-semibold">
              Social Media Shares
            </span>
          </div>
          <div className="min-w-0 text-right">
            <span className="text-ink-900 text-sm font-bold">
              {integrationStatus.socialMediaTotal.toLocaleString()}
            </span>
            <div>
              {renderStatusBadge(
                integrationStatus.socialMediaSuccessRate,
                integrationStatus.socialMediaTotal
              )}
            </div>
          </div>
        </div>

        {/* Sync Incidents */}
        <div className="border-ink-200/80 bg-ink-50/70 hover:bg-ink-50 flex items-center justify-between gap-2 rounded-xl border p-3.5 transition-all max-md:flex-wrap max-md:p-2.5">
          <div className="flex min-w-0 items-center gap-2.5 max-md:gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <span className="text-ink-800 text-xs font-semibold">
              Sync Incidents
            </span>
          </div>
          <div className="min-w-0 text-right">
            <span
              className={`text-sm font-bold ${
                integrationStatus.failedIntegrationsCount > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-ink-900"
              }`}
            >
              {integrationStatus.failedIntegrationsCount}
            </span>
            <div>
              {integrationStatus.failedIntegrationsCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                  Action Req
                </span>
              ) : (
                <span className="text-ink-500 inline-flex items-center gap-1.5 text-[11px] font-medium">
                  <span className="bg-ink-400 h-1.5 w-1.5 rounded-full" />
                  No traffic
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
