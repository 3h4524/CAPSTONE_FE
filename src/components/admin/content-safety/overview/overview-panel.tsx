"use client";

import { useState } from "react";
import { AlertTriangle, CircleDashed, Gauge, ScanSearch, ShieldX, Timer } from "lucide-react";

import { AdminMetricCard } from "@/components/admin/admin-metric-card";
import { CategoryBreakdown, DeciderBreakdown, FeatureBreakdown } from "@/components/admin/content-safety/overview/breakdowns";
import { DecisionsChart } from "@/components/admin/content-safety/overview/decisions-chart";
import { OffendersTable } from "@/components/admin/content-safety/overview/offenders-table";
import {
  formatNumber,
  formatPercent,
  PanelMessage,
  RANGE_OPTIONS,
  Section,
  StorageMissingBanner,
} from "@/components/admin/content-safety/shared";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useModerationOffenders, useModerationOverview } from "@/hooks/queries/use-admin-moderation";
import type { ModerationRangeDays } from "@/types/admin-moderation";
import { cn } from "@/utils/cn";

const RangePicker = ({ value, onChange }: { value: ModerationRangeDays; onChange: (days: ModerationRangeDays) => void }) => (
  <div role="radiogroup" aria-label="Period" className="bg-ink-100 dark:bg-ink-800/60 inline-flex rounded-lg p-1">
    {RANGE_OPTIONS.map((days) => (
      <button
        key={days}
        type="button"
        role="radio"
        aria-checked={value === days}
        onClick={() => onChange(days)}
        className={cn(
          "min-h-9 rounded-md px-3 text-sm font-medium transition-colors",
          value === days
            ? "bg-card text-ink-900 dark:text-ink-50 shadow-sm"
            : "text-ink-600 hover:text-ink-900 dark:hover:text-ink-100"
        )}
      >
        {days} days
      </button>
    ))}
  </div>
);

export const OverviewPanel = ({ onOpenLog }: { onOpenLog: () => void }) => {
  const [days, setDays] = useState<ModerationRangeDays>(30);
  const overview = useModerationOverview(days);
  const offenders = useModerationOffenders(days);
  const data = overview.data;

  return (
    <div className="flex flex-col gap-5 max-md:gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangePicker value={days} onChange={setDays} />
        <Button type="button" variant="outline" size="sm" onClick={onOpenLog}>
          Open activity log
        </Button>
      </div>

      {data && !data.storageReady && <StorageMissingBanner />}

      {overview.isError ? (
        <Section title="Overview">
          <PanelMessage tone="error" title="The overview could not be loaded." description="Check the API and try again." />
        </Section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {data ? (
              <>
                <AdminMetricCard label="Checks" value={formatNumber(data.totals.checks)} context={`Last ${days} days`} icon={ScanSearch} />
                <AdminMetricCard label="Blocked" value={formatNumber(data.totals.blocked)} context="Refused by the guardrail" icon={ShieldX} />
                <AdminMetricCard label="Block rate" value={formatPercent(data.totals.blockRate)} context="Of all checks" icon={Gauge} />
                <AdminMetricCard label="Flagged" value={formatNumber(data.totals.flagged)} context="Let through, worth a look" icon={AlertTriangle} />
                <AdminMetricCard
                  label="Unchecked"
                  value={formatNumber(data.totals.unchecked)}
                  context="Gemini could not answer"
                  icon={CircleDashed}
                />
                <AdminMetricCard
                  label="Avg. check time"
                  value={data.totals.averageLatencyMs === null ? "—" : `${formatNumber(data.totals.averageLatencyMs)} ms`}
                  context="Blocklist and Gemini"
                  icon={Timer}
                />
              </>
            ) : (
              Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-[74px] rounded-xl" />)
            )}
          </div>

          <Section
            title="Decisions per day"
            description="Every check the guardrail ran, by what it decided. Cached repeats of the same text are not counted again."
          >
            {data ? <DecisionsChart daily={data.daily} /> : <Skeleton className="h-64 w-full" />}
          </Section>

          <div className="grid gap-5 max-md:gap-3 lg:grid-cols-3">
            <Section title="By category" description="Checks blocked or flagged in each category.">
              {data ? <CategoryBreakdown items={data.byCategory} /> : <Skeleton className="h-40 w-full" />}
            </Section>
            <Section title="Who blocked" description="Blocks made by the keyword blocklist, by Gemini, or by Gemini's own safety filter.">
              {data ? <DeciderBreakdown items={data.byDecider} /> : <Skeleton className="h-40 w-full" />}
            </Section>
            <Section title="By feature" description="Where the checks ran, with the blocked share in red.">
              {data ? <FeatureBreakdown items={data.byFeature} /> : <Skeleton className="h-40 w-full" />}
            </Section>
          </div>

          <Section title="Sellers blocked most often" description={`The ten sellers with the most blocks in the last ${days} days.`}>
            {offenders.isError ? (
              <PanelMessage tone="error" title="The sellers could not be loaded." />
            ) : offenders.data ? (
              <OffendersTable offenders={offenders.data} />
            ) : (
              <Skeleton className="h-40 w-full" />
            )}
          </Section>
        </>
      )}
    </div>
  );
};
