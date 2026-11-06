 
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
      <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
          <div className="h-9 w-9 animate-pulse rounded-lg bg-slate-100" />
          <div className="space-y-1.5">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-48 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  const renderStatusBadge = (rate: number, total: number) => {
    if (total === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Inactive
        </span>
      );
    }
    if (rate >= 95) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {rate.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        {rate.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Plug className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Integrations</h3>
          <p className="text-xs text-slate-500">
            Uploads and shares sent to Etsy, Printify and social channels
          </p>
        </div>
      </div>

      {/* 2x2 Grid of Channels */}
      <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
        {/* Etsy */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition-all hover:bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-[10px] font-bold text-white shadow-2xs">
              Etsy
            </div>
            <span className="text-xs font-semibold text-slate-800">
              Etsy Marketplace
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-slate-900">
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
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition-all hover:bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#22c55e] text-[11px] font-bold text-white shadow-2xs">
              P
            </div>
            <span className="text-xs font-semibold text-slate-800">
              Printify Fulfillment
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-slate-900">
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
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition-all hover:bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200/80 text-slate-700">
              <Share2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-800">
              Social Media Shares
            </span>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-slate-900">
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
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition-all hover:bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-slate-800">
              Sync Incidents
            </span>
          </div>
          <div className="text-right">
            <span
              className={`text-sm font-bold ${
                integrationStatus.failedIntegrationsCount > 0
                  ? "text-rose-600"
                  : "text-slate-900"
              }`}
            >
              {integrationStatus.failedIntegrationsCount}
            </span>
            <div>
              {integrationStatus.failedIntegrationsCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />
                  Action Req
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
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
