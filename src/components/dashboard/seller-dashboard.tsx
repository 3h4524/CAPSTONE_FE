"use client";

import { useState } from "react";

import { PageLoading } from "@/components/commons/layout/page-loading";
import { ActionInbox } from "@/components/dashboard/action-inbox";
import { AiUsagePanel } from "@/components/dashboard/ai-usage-panel";
import { AllowancePanel } from "@/components/dashboard/allowance-panel";
import { BatchGaugeCard } from "@/components/dashboard/batch-gauge-card";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { ExportButton } from "@/components/dashboard/export-button";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { PeriodSwitcher } from "@/components/dashboard/period-switcher";
import { PipelineFunnel } from "@/components/dashboard/pipeline-funnel";
import { ProductionChart } from "@/components/dashboard/production-chart";
import { useAllowances } from "@/hooks/queries/use-allowances";
import { useDashboardActionItems } from "@/hooks/queries/use-dashboard-action-items";
import { useDashboardSummary } from "@/hooks/queries/use-dashboard-summary";
import type { DashboardPeriod } from "@/types/seller-dashboard";
import { cn } from "@/utils/cn";

// Each block fades up a beat after the one above it when the Dashboard opens.
const reveal = (step: number) => ({
  className:
    "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 duration-500 fill-mode-both",
  style: { animationDelay: `${step * 90}ms` },
});

/**
 * The Seller's Dashboard: the period's figures; then who they are, the running batch and what is
 * left of the plan, with how production and AI spend moved beneath; and where products sit, stage
 * by stage. A new Seller gets the first steps instead.
 */
export const SellerDashboard = () => {
  const [days, setDays] = useState<DashboardPeriod>(30);
  const [actionsOpen, setActionsOpen] = useState(false);
  const { data: summary, isPending: isSummaryPending, isError } = useDashboardSummary(days);
  const { data: actionItems, isPending: isActionItemsPending } = useDashboardActionItems();
  const items = actionItems?.items ?? [];
  // The allowance panel hides itself on a paid plan; the grid drops its column to match.
  const { data: allowances } = useAllowances();
  const hasAllowance = (allowances?.items.length ?? 0) > 0;

  if (isSummaryPending) return <PageLoading label="Loading dashboard" />;
  if (isError || !summary)
    return (
      <div className="space-y-1 p-4 sm:p-6">
        <h1 className="text-base font-semibold">Your dashboard is temporarily unavailable</h1>
        <p className="text-muted-foreground text-sm">Please refresh the page and try again.</p>
      </div>
    );

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 md:block md:space-y-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm max-md:hidden">
          Overview of the last <span className="text-foreground font-medium">{days} days</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 max-md:w-full max-md:justify-between">
          <PeriodSwitcher value={days} onChange={setDays} />
          <ExportButton summary={summary} />
        </div>
      </header>

      {/* 1. How the period went. */}
      <div {...reveal(0)}>
        <KpiRow kpis={summary.kpis} days={days} />
      </div>

      {/* 2. Who they are and what needs them, beside the running batch and what is left of the
          plan, kept compact so the welcome card stays wide and low. A paid plan has no
          allowance column. */}
      <section
        className={cn(
          "grid grid-cols-1 gap-4 md:grid-cols-2",
          hasAllowance
            ? "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]"
            : "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
          reveal(1).className
        )}
        style={reveal(1).style}
      >
        <div className="md:col-span-2 xl:col-span-1">
          <DashboardHero
            items={items}
            activeBatchCount={summary.activeBatches.length}
            onOpenActions={() => setActionsOpen(true)}
          />
        </div>
        <BatchGaugeCard batches={summary.activeBatches} />
        {hasAllowance && <AllowancePanel />}
      </section>

      {/* 3. How production and AI spend moved over the period, split 7 : 3. */}
      <section
        className={cn(
          "grid grid-cols-1 gap-4 max-md:order-last lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]",
          reveal(2).className
        )}
        style={reveal(2).style}
      >
        <ProductionChart trend={summary.trend} />
        <AiUsagePanel usage={summary.aiUsage} />
      </section>

      {/* 4. Where every product is, stage by stage. */}
      <section {...reveal(3)}>
        <PipelineFunnel stages={summary.pipeline} failedProducts={summary.failedProducts} />
      </section>

      <ActionInbox
        items={items}
        isLoading={isActionItemsPending}
        open={actionsOpen}
        onOpenChange={setActionsOpen}
      />
    </div>
  );
};
