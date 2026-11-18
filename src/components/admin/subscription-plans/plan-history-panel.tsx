"use client";

import { useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, Copy, Gauge, History, Layers, Puzzle, Settings2, ToggleRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PhonePager } from "@/components/commons/data-display/phone-pager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePlanHistory } from "@/hooks/queries/use-plan-history";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { PlanHistoryAction, PlanHistoryEntry } from "@/types/admin-subscription-plan";
import { cn } from "@/utils/cn";

const ACTION_FILTERS: { value: PlanHistoryAction | undefined; labelKey: string }[] = [
  { value: undefined, labelKey: "admin.plans.history.filterAll" },
  { value: "add", labelKey: "admin.plans.history.filterAdd" },
  { value: "edit", labelKey: "admin.plans.shared.edit" },
  { value: "delete", labelKey: "admin.plans.cardGrid.delete" },
];

const DESKTOP_PAGE_SIZE = 10;
const PHONE_PAGE_SIZE = 5;

const KIND: Record<PlanHistoryEntry["kind"], { icon: typeof History; labelKey: string }> = {
  plan: { icon: Layers, labelKey: "admin.plans.history.kindPlan" },
  feature: { icon: ToggleRight, labelKey: "admin.plans.history.kindFeature" },
  limit: { icon: Gauge, labelKey: "admin.plans.history.kindLimit" },
  catalog: { icon: Puzzle, labelKey: "admin.plans.history.kindCatalog" },
  settings: { icon: Settings2, labelKey: "admin.plans.history.kindSettings" },
  duplicate: { icon: Copy, labelKey: "admin.plans.history.kindDuplicate" },
  order: { icon: ArrowDownUp, labelKey: "admin.plans.history.kindOrder" },
  other: { icon: History, labelKey: "admin.plans.history.kindOther" },
};

const formatDay = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const formatTime = (value: string) => new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// Who changed what on the plans, Free and the trial, newest first and grouped by day: the record to
// point to when a Seller asks why something they had is gone.
export function PlanHistoryPanel() {
  const { t } = useTranslation("common");
  const isPhone = useIsPhone();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<PlanHistoryAction>();
  const { data, isLoading, isPlaceholderData } = usePlanHistory(page, isPhone ? PHONE_PAGE_SIZE : DESKTOP_PAGE_SIZE, action);
  const filters = (
    <div role="group" aria-label={t("admin.plans.history.filterAria")} className="flex gap-1.5 max-md:grid max-md:grid-cols-4">
      {ACTION_FILTERS.map((filter) => (
        <button
          key={filter.labelKey}
          type="button"
          aria-pressed={action === filter.value}
          onClick={() => {
            setAction(filter.value);
            setPage(1);
          }}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-semibold transition-colors max-md:min-h-9",
            action === filter.value ? "border-ink-900 bg-ink-900 text-card" : "border-ink-200 bg-card text-ink-600 hover:border-ink-300"
          )}
        >
          {t(filter.labelKey)}
        </button>
      ))}
    </div>
  );

  if (isLoading || !data) {
    return <Card className="border-ink-200/80 bg-card mt-6 h-64 animate-pulse rounded-2xl border" />;
  }

  const entries = data.items;
  if (data.totalCount === 0 && action) {
    return (
      <div className="mt-6 space-y-4">
        {filters}
        <Card className="border-ink-300 bg-card rounded-2xl border border-dashed p-10 text-center">
          <p className="text-ink-700 text-sm font-semibold">{t("admin.plans.history.noChangesOfKind")}</p>
        </Card>
      </div>
    );
  }

  if (data.totalCount === 0) {
    return (
      <Card className="border-ink-300 bg-card mt-6 rounded-2xl border border-dashed p-10 text-center">
        <History className="text-ink-400 mx-auto size-6" />
        <p className="text-ink-700 mt-2 text-sm font-semibold">{t("admin.plans.history.noChangesYet")}</p>
        <p className="text-ink-400 text-xs">{t("admin.plans.history.noChangesHint")}</p>
      </Card>
    );
  }

  const days = [...new Set(entries.map((entry) => formatDay(entry.at)))];
  const first = (data.pageNumber - 1) * data.pageSize + 1;
  const last = first + entries.length - 1;

  return (
    <div className={cn("mt-6 space-y-4 transition-opacity", isPlaceholderData && "opacity-60")}>
      {filters}
      <p className="text-ink-500 text-xs">
        <strong className="text-ink-800">{data.totalCount.toLocaleString()}</strong>{" "}
        {t("admin.plans.history.totalChanges")}
      </p>
      {days.map((day) => (
        <Card key={day} className="border-ink-200/80 bg-card gap-0 overflow-hidden rounded-2xl border p-0 shadow-xs">
          <p className="border-ink-100 bg-ink-50/80 text-ink-500 border-b px-5 py-2 text-[11px] font-semibold tracking-wide uppercase">
            {day}
          </p>
          <ul className="divide-ink-100 divide-y">
            {entries
              .filter((entry) => formatDay(entry.at) === day)
              .map((entry) => {
                const { icon: Icon, labelKey } = KIND[entry.kind] ?? KIND.other;
                return (
                  <li key={entry.id} className="flex items-start gap-3 px-5 py-3 max-md:px-3.5">
                    <span className="bg-ink-100 text-ink-500 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink-800 text-sm">{entry.summary}</p>
                      <p className="text-ink-400 mt-0.5 text-[11px]">
                        {t(labelKey)}
                        {entry.planName && ` · ${entry.planName}`} · {entry.actorName ?? t("admin.plans.history.unknownAdmin")}
                      </p>
                    </div>
                    <time dateTime={entry.at} className="text-ink-400 shrink-0 text-xs tabular-nums">
                      {formatTime(entry.at)}
                    </time>
                  </li>
                );
              })}
          </ul>
        </Card>
      ))}

      {isPhone ? (
        <PhonePager page={data.pageNumber} pageCount={data.totalPages} onPageChange={setPage} label={t("admin.plans.history.pages")} />
      ) : data.totalPages > 1 && (
        <nav aria-label={t("admin.plans.history.pages")} className="text-ink-500 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="tabular-nums">
            {t("admin.plans.catalog.rangeOfTotal", { from: first.toLocaleString(), to: last.toLocaleString(), total: data.totalCount.toLocaleString() })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={data.pageNumber <= 1 || isPlaceholderData}
              onClick={() => setPage(data.pageNumber - 1)}
            >
              <ChevronLeft className="size-3.5" /> {t("admin.plans.history.newer")}
            </Button>
            <span className="tabular-nums">
              {t("admin.plans.catalog.pageOf", { page: data.pageNumber, total: data.totalPages })}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={data.pageNumber >= data.totalPages || isPlaceholderData}
              onClick={() => setPage(data.pageNumber + 1)}
            >
              {t("admin.plans.history.older")} <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
