"use client";

import React from "react";

import type { RevenueInsightsDto, TransactionStatus } from "@/types/revenue";

import { FinancialAlertsCard } from "./FinancialAlertsCard";
import { RevenueForecastCard } from "./RevenueForecastCard";
import { SubscriptionAnalyticsCard } from "./SubscriptionAnalyticsCard";

interface RevenueInsightsRowProps {
  data?: RevenueInsightsDto;
  isLoading?: boolean;
  onReviewAlert?: (status: TransactionStatus) => void;
}

export function RevenueInsightsRow({
  data,
  isLoading,
  onReviewAlert,
}: RevenueInsightsRowProps) {
  return (
    // On a phone the three cards join the page's own column, so the alerts can come first.
    <div className="grid grid-cols-1 gap-4 max-md:contents xl:grid-cols-12">
      {/* 1. Subscription Analytics (5 cols on xl) */}
      <div className="flex h-full flex-col max-md:order-2 xl:col-span-5">
        <SubscriptionAnalyticsCard
          data={data?.subscriptionAnalytics}
          isLoading={isLoading}
        />
      </div>

      {/* 2. Revenue Forecast (4 cols on xl) */}
      <div className="flex h-full flex-col max-md:order-2 xl:col-span-4">
        <RevenueForecastCard
          data={data?.forecast}
          isLoading={isLoading}
        />
      </div>

      {/* 3. Financial Alerts (3 cols on xl) */}
      <div className="flex h-full flex-col max-md:order-1 xl:col-span-3">
        <FinancialAlertsCard
          alerts={data?.financialAlerts}
          isLoading={isLoading}
          onReview={onReviewAlert}
        />
      </div>
    </div>
  );
}
