"use client";

import { useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, Copy, Gauge, History, Layers, Puzzle, Settings2, ToggleRight } from "lucide-react";

import { PhonePager } from "@/components/commons/data-display/phone-pager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePlanHistory } from "@/hooks/queries/use-plan-history";
import { useIsPhone } from "@/hooks/use-is-phone";
import type { PlanHistoryAction, PlanHistoryEntry } from "@/types/admin-subscription-plan";
import { cn } from "@/utils/cn";

const ACTION_FILTERS: { value: PlanHistoryAction | undefined; label: string }[] = [
  { value: undefined, label: "All" },
  { value: "add", label: "Add" },
  { value: "edit", label: "Edit" },
  { value: "delete", label: "Delete" },
];

const DESKTOP_PAGE_SIZE = 10;
const PHONE_PAGE_SIZE = 5;

const KIND: Record<PlanHistoryEntry["kind"], { icon: typeof History; label: string }> = {
  plan: { icon: Layers, label: "Plan" },
  feature: { icon: ToggleRight, label: "Plan feature" },
  limit: { icon: Gauge, label: "Plan limit" },
  catalog: { icon: Puzzle, label: "Feature catalog" },
  settings: { icon: Settings2, label: "Free and trial" },
  duplicate: { icon: Copy, label: "New plan" },
  order: { icon: ArrowDownUp, label: "Plan order" },
  other: { icon: History, label: "Change" },
};

const formatDay = (value: string) =>
  new Date(value).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const formatTime = (value: string) => new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// Who changed what on the plans, Free and the trial, newest first and grouped by day: the record to
// point to when a Seller asks why something they had is gone.
export function PlanHistoryPanel() {
  const isPhone = useIsPhone();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<PlanHistoryAction>();
  const { data, isLoading, isPlaceholderData } = usePlanHistory(page, isPhone ? PHONE_PAGE_SIZE : DESKTOP_PAGE_SIZE, action);
  const filters = (
    <div role="group" aria-label="Filter changes" className="flex gap-1.5 max-md:grid max-md:grid-cols-4">
      {ACTION_FILTERS.map((filter) => (
        <button
          key={filter.label}
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
          {filter.label}
        </button>
      ))}
    </div>
  );

  if (isLoading || !data) {
    return <Card className="mt-6 h-64 animate-pulse rounded-2xl border border-ink-200/80 bg-card" />;
  }

  const entries = data.items;
  if (data.totalCount === 0 && action) {
    return (
      <div className="mt-6 space-y-4">
        {filters}
        <Card className="rounded-2xl border border-dashed border-ink-300 bg-card p-10 text-center">
          <p className="text-sm font-semibold text-ink-700">No changes of this kind yet</p>
        </Card>
      </div>
    );
  }

  if (data.totalCount === 0) {
    return (
      <Card className="mt-6 rounded-2xl border border-dashed border-ink-300 bg-card p-10 text-center">
        <History className="mx-auto size-6 text-ink-400" />
        <p className="mt-2 text-sm font-semibold text-ink-700">No changes yet</p>
        <p className="text-xs text-ink-400">Plan edits, features, limits and Free or trial settings show up here.</p>
      </Card>
    );
  }

  const days = [...new Set(entries.map((entry) => formatDay(entry.at)))];
  const first = (data.pageNumber - 1) * data.pageSize + 1;
  const last = first + entries.length - 1;

  return (
    <div className={cn("mt-6 space-y-4 transition-opacity", isPlaceholderData && "opacity-60")}>
      {filters}
      <p className="text-xs text-ink-500">
        <strong className="text-ink-800">{data.totalCount.toLocaleString()}</strong> changes to the plans, their features, the feature
        catalog, Free and the trial, newest first.
      </p>
      {days.map((day) => (
        <Card key={day} className="gap-0 overflow-hidden rounded-2xl border border-ink-200/80 bg-card p-0 shadow-xs">
          <p className="border-b border-ink-100 bg-ink-50/80 px-5 py-2 text-[11px] font-semibold tracking-wide text-ink-500 uppercase">
            {day}
          </p>
          <ul className="divide-y divide-ink-100">
            {entries
              .filter((entry) => formatDay(entry.at) === day)
              .map((entry) => {
                const { icon: Icon, label } = KIND[entry.kind] ?? KIND.other;
                return (
                  <li key={entry.id} className="flex items-start gap-3 px-5 py-3 max-md:px-3.5">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                      <Icon className="size-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink-800">{entry.summary}</p>
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        {label}
                        {entry.planName && ` · ${entry.planName}`} · {entry.actorName ?? "Unknown admin"}
                      </p>
                    </div>
                    <time dateTime={entry.at} className="shrink-0 text-xs text-ink-400 tabular-nums">
                      {formatTime(entry.at)}
                    </time>
                  </li>
                );
              })}
          </ul>
        </Card>
      ))}

      {isPhone ? (
        <PhonePager page={data.pageNumber} pageCount={data.totalPages} onPageChange={setPage} label="History pages" />
      ) : data.totalPages > 1 && (
        <nav aria-label="History pages" className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
          <span className="tabular-nums">
            {first.toLocaleString()}–{last.toLocaleString()} of {data.totalCount.toLocaleString()}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={data.pageNumber <= 1 || isPlaceholderData}
              onClick={() => setPage(data.pageNumber - 1)}
            >
              <ChevronLeft className="size-3.5" /> Newer
            </Button>
            <span className="tabular-nums">
              Page {data.pageNumber} of {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              disabled={data.pageNumber >= data.totalPages || isPlaceholderData}
              onClick={() => setPage(data.pageNumber + 1)}
            >
              Older <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
