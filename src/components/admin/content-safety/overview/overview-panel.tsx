"use client";

import { useState } from "react";
import { AlertTriangle, CircleDashed, Gauge, ScanSearch, ShieldX, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

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

const RangePicker = ({ value, onChange }: { value: ModerationRangeDays; onChange: (days: ModerationRangeDays) => void }) => {
  const { t } = useTranslation("common");
  return (
    <div role="radiogroup" aria-label={t("admin.contentSafety.common.period")} className="bg-ink-100 inline-flex rounded-lg p-1">
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
              ? "bg-card text-ink-900 shadow-sm dark:ring-1 dark:ring-white/15"
              : "text-ink-600 hover:text-ink-900"
          )}
        >
          {t("admin.contentSafety.overview.rangeDays", { days })}
        </button>
      ))}
    </div>
  );
};

export const OverviewPanel = ({ onOpenLog }: { onOpenLog: () => void }) => {
  const { t } = useTranslation("common");
  const [days, setDays] = useState<ModerationRangeDays>(7);
  const overview = useModerationOverview(days);
  const offenders = useModerationOffenders(days);
  const data = overview.data;

  return (
    <div className="flex flex-col gap-5 max-md:gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <RangePicker value={days} onChange={setDays} />
        <Button type="button" variant="outline" size="sm" onClick={onOpenLog}>
          {t("admin.contentSafety.overview.openLog")}
        </Button>
      </div>

      {data && !data.storageReady && <StorageMissingBanner />}

      {overview.isError ? (
        <Section title={t("admin.contentSafety.tabs.overview")}>
          <PanelMessage
            tone="error"
            title={t("admin.contentSafety.overview.loadError")}
            description={t("admin.contentSafety.common.checkApiRetry")}
          />
        </Section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {data ? (
              <>
                <AdminMetricCard
                  label={t("admin.contentSafety.metrics.checks")}
                  value={formatNumber(data.totals.checks)}
                  context={t("admin.contentSafety.metrics.lastDays", { days })}
                  icon={ScanSearch}
                />
                <AdminMetricCard
                  label={t("admin.contentSafety.decisions.block")}
                  value={formatNumber(data.totals.blocked)}
                  context={t("admin.contentSafety.metrics.refused")}
                  icon={ShieldX}
                />
                <AdminMetricCard
                  label={t("admin.contentSafety.metrics.blockRate")}
                  value={formatPercent(data.totals.blockRate)}
                  context={t("admin.contentSafety.metrics.ofAllChecks")}
                  icon={Gauge}
                />
                <AdminMetricCard
                  label={t("admin.contentSafety.decisions.flagged")}
                  value={formatNumber(data.totals.flagged)}
                  context={t("admin.contentSafety.metrics.letThrough")}
                  icon={AlertTriangle}
                />
                <AdminMetricCard
                  label={t("admin.contentSafety.decisions.unchecked")}
                  value={formatNumber(data.totals.unchecked)}
                  context={t("admin.contentSafety.metrics.geminiNoAnswer")}
                  icon={CircleDashed}
                />
                <AdminMetricCard
                  label={t("admin.contentSafety.metrics.avgCheckTime")}
                  value={data.totals.averageLatencyMs === null ? "—" : `${formatNumber(data.totals.averageLatencyMs)} ms`}
                  context={t("admin.contentSafety.metrics.blocklistAndGemini")}
                  icon={Timer}
                />
              </>
            ) : (
              Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-[74px] rounded-xl" />)
            )}
          </div>

          <Section
            title={t("admin.contentSafety.overview.decisionsPerDay")}
            description={t("admin.contentSafety.overview.decisionsPerDayDesc")}
          >
            {data ? <DecisionsChart daily={data.daily} /> : <Skeleton className="h-64 w-full" />}
          </Section>

          <div className="grid gap-5 max-md:gap-3 lg:grid-cols-3">
            <Section title={t("admin.contentSafety.overview.byCategory")} description={t("admin.contentSafety.overview.byCategoryDesc")}>
              {data ? <CategoryBreakdown items={data.byCategory} /> : <Skeleton className="h-40 w-full" />}
            </Section>
            <Section title={t("admin.contentSafety.overview.whoBlocked")} description={t("admin.contentSafety.overview.whoBlockedDesc")}>
              {data ? <DeciderBreakdown items={data.byDecider} /> : <Skeleton className="h-40 w-full" />}
            </Section>
            <Section title={t("admin.contentSafety.overview.byFeature")} description={t("admin.contentSafety.overview.byFeatureDesc")}>
              {data ? <FeatureBreakdown items={data.byFeature} /> : <Skeleton className="h-40 w-full" />}
            </Section>
          </div>

          <Section
            title={t("admin.contentSafety.overview.sellersBlockedMost")}
            description={t("admin.contentSafety.overview.sellersBlockedMostDesc", { days })}
          >
            {offenders.isError ? (
              <PanelMessage tone="error" title={t("admin.contentSafety.overview.sellersLoadError")} />
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
