"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AllowlistDialog,type AllowlistDialogTarget } from "@/components/admin/content-safety/blocklist/allowlist-dialog";
import { CheckDetailSheet } from "@/components/admin/content-safety/log/check-detail-sheet";
import {
  CATEGORY_LABEL_KEYS,
  CATEGORY_ORDER,
  CategoryChips,
  DECIDER_LABEL_KEYS,
  DeciderBadge,
  DECISION_LABEL_KEYS,
  DecisionBadge,
  FEATURE_LABEL_KEYS,
  featureLabel,
  formatDateTime,
  formatNumber,
  PanelMessage,
  Section,
  subjectLabel,
} from "@/components/admin/content-safety/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useModerationChecks } from "@/hooks/queries/use-admin-moderation";
import { useIsPhone } from "@/hooks/use-is-phone";
import type {
  ModerationCategory,
  ModerationCheckFilter,
  ModerationCheckListItem,
  ModerationDecider,
  ModerationDecision,
} from "@/types/admin-moderation";
import { cn } from "@/utils/cn";

const ALL = "all";
const PAGE_SIZE = 20;
const headClass = "text-ink-500 text-xs font-semibold tracking-wider uppercase";

const PERIODS = [
  { value: "1", labelKey: "admin.contentSafety.periods.hours24" },
  { value: "7", labelKey: "admin.contentSafety.periods.days7" },
  { value: "30", labelKey: "admin.contentSafety.periods.days30" },
  { value: "90", labelKey: "admin.contentSafety.periods.days90" },
  { value: ALL, labelKey: "admin.contentSafety.periods.all" },
] as const;

type Filters = {
  period: string;
  decision?: ModerationDecision;
  decidedBy?: ModerationDecider;
  feature?: string;
  category?: ModerationCategory;
};

// The start of the period, rounded to the minute so the query key stays the same between renders.
const periodStart = (period: string) => {
  if (period === ALL) return undefined;
  const start = new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);
  start.setSeconds(0, 0);
  return start.toISOString();
};

const FilterSelect = <T extends string>({
  label,
  value,
  onChange,
  allLabel,
  options,
  className,
}: {
  label: string;
  value: T | undefined;
  onChange: (value: T | undefined) => void;
  allLabel: string;
  options: { value: T; label: string }[];
  className?: string;
}) => (
  <Select value={value ?? ALL} onValueChange={(next) => onChange(next === ALL ? undefined : (next as T))}>
    <SelectTrigger className={cn("w-40", className)} aria-label={label}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value={ALL}>{allLabel}</SelectItem>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

const Excerpt = ({ item }: { item: ModerationCheckListItem }) => {
  const { t } = useTranslation("common");
  const missingText = t(item.direction === "output" ? "admin.contentSafety.log.imageKeepsNoText" : "admin.contentSafety.common.allowedTextNotKept");
  return item.excerptPreview ? (
    <span className="text-ink-700 line-clamp-2 max-w-72 text-xs">{item.excerptPreview}</span>
  ) : (
    <span className="text-ink-400 text-xs" title={missingText}>
      —<span className="sr-only">{missingText}</span>
    </span>
  );
};

export const LogPanel = () => {
  const { t } = useTranslation("common");
  const isPhone = useIsPhone();
  const [filters, setFilters] = useState<Filters>({ period: "30" });
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const [openCheck, setOpenCheck] = useState<string | null>(null);
  const [allowTarget, setAllowTarget] = useState<AllowlistDialogTarget>(null);

  const query = useMemo<ModerationCheckFilter>(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      decision: filters.decision,
      decidedBy: filters.decidedBy,
      feature: filters.feature,
      category: filters.category,
      search: deferredSearch || undefined,
      from: periodStart(filters.period),
    }),
    [deferredSearch, filters, page]
  );
  const checks = useModerationChecks(query);

  // Any change of filter starts again from the first page.
  const updateFilters = (next: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...next }));
    setPage(1);
  };

  const data = checks.data;
  const first = data && data.totalCount > 0 ? (data.pageNumber - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.pageNumber * data.pageSize, data.totalCount) : 0;

  return (
    <div className="flex flex-col gap-5 max-md:gap-3">
      <Section
        title={t("admin.contentSafety.tabs.log")}
        description={t("admin.contentSafety.log.description")}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="text-ink-400 pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden="true" />
              <Input
                type="search"
                aria-label={t("admin.contentSafety.log.searchAria")}
                placeholder={t("admin.contentSafety.log.searchPlaceholder")}
                className="pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select value={filters.period} onValueChange={(period) => updateFilters({ period })}>
              <SelectTrigger className="w-40" aria-label={t("admin.contentSafety.common.period")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIODS.map((period) => (
                  <SelectItem key={period.value} value={period.value}>
                    {t(period.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FilterSelect
              label={t("admin.contentSafety.common.decision")}
              allLabel={t("admin.contentSafety.log.allDecisions")}
              value={filters.decision}
              onChange={(decision) => updateFilters({ decision })}
              options={(["block", "flagged", "unchecked", "allow"] as ModerationDecision[]).map((value) => ({
                value,
                label: t(DECISION_LABEL_KEYS[value]),
              }))}
            />
            <FilterSelect
              label={t("admin.contentSafety.common.decidedBy")}
              allLabel={t("admin.contentSafety.log.anyLayer")}
              value={filters.decidedBy}
              onChange={(decidedBy) => updateFilters({ decidedBy })}
              options={(["blocklist", "gemini", "provider_safety", "error"] as ModerationDecider[]).map((value) => ({
                value,
                label: t(DECIDER_LABEL_KEYS[value]),
              }))}
            />
            <FilterSelect
              label={t("admin.contentSafety.common.feature")}
              allLabel={t("admin.contentSafety.log.allFeatures")}
              value={filters.feature}
              onChange={(feature) => updateFilters({ feature })}
              options={Object.entries(FEATURE_LABEL_KEYS).map(([value, key]) => ({ value, label: t(key) }))}
              className="w-44"
            />
            <FilterSelect
              label={t("admin.contentSafety.common.category")}
              allLabel={t("admin.contentSafety.common.allCategories")}
              value={filters.category}
              onChange={(category) => updateFilters({ category })}
              options={CATEGORY_ORDER.map((value) => ({ value, label: t(CATEGORY_LABEL_KEYS[value]) }))}
              className="w-44"
            />
          </div>

          {checks.isError ? (
            <PanelMessage tone="error" title={t("admin.contentSafety.log.loadError")} description={t("admin.contentSafety.common.checkApiRetry")} />
          ) : !data ? (
            <Skeleton className="h-72 w-full" />
          ) : data.items.length === 0 ? (
            <PanelMessage
              title={t("admin.contentSafety.log.emptyTitle")}
              description={t("admin.contentSafety.log.emptyDescription")}
            />
          ) : isPhone ? (
            <ul className="space-y-2">
              {data.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setOpenCheck(item.id)}
                    className="border-ink-200 hover:bg-ink-50 dark:hover:bg-ink-800/40 w-full rounded-lg border p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <DecisionBadge decision={item.decision} />
                      <span className="text-ink-500 text-xs">{formatDateTime(item.createdAt)}</span>
                    </div>
                    <p className="text-ink-900 mt-2 truncate text-sm font-medium">
                      {item.userEmail ?? t("admin.contentSafety.log.unknownSeller")}
                    </p>
                    <p className="text-ink-500 text-xs">
                      {featureLabel(item.feature)} · {subjectLabel(item.subjectType)} · {t(DECIDER_LABEL_KEYS[item.decidedBy])}
                    </p>
                    {item.excerptPreview ? (
                      <p className="text-ink-700 mt-1.5 line-clamp-2 text-xs">{item.excerptPreview}</p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className={cn("overflow-x-auto transition-opacity", checks.isFetching && "opacity-70")}>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={headClass}>{t("admin.contentSafety.log.time")}</TableHead>
                    <TableHead className={headClass}>{t("admin.contentSafety.common.seller")}</TableHead>
                    <TableHead className={headClass}>{t("admin.contentSafety.log.where")}</TableHead>
                    <TableHead className={headClass}>{t("admin.contentSafety.common.decision")}</TableHead>
                    <TableHead className={headClass}>{t("admin.contentSafety.common.decidedBy")}</TableHead>
                    <TableHead className={headClass}>{t("admin.contentSafety.common.categories")}</TableHead>
                    <TableHead className={headClass}>{t("admin.contentSafety.log.text")}</TableHead>
                    <TableHead className={`${headClass} text-right`}>{t("admin.contentSafety.log.timeTaken")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow
                      key={item.id}
                      tabIndex={0}
                      aria-label={t("admin.contentSafety.log.openCheckAria", { time: formatDateTime(item.createdAt) })}
                      onClick={() => setOpenCheck(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setOpenCheck(item.id);
                        }
                      }}
                      className="focus-visible:bg-ink-50 cursor-pointer outline-none"
                    >
                      <TableCell className="text-ink-600 text-xs whitespace-nowrap">{formatDateTime(item.createdAt)}</TableCell>
                      <TableCell className="max-w-52">
                        <p className="text-ink-900 truncate text-sm">{item.userEmail ?? "—"}</p>
                      </TableCell>
                      <TableCell className="text-xs">
                        <p className="text-ink-800">{featureLabel(item.feature)}</p>
                        <p className="text-ink-500">{subjectLabel(item.subjectType)}</p>
                      </TableCell>
                      <TableCell>
                        <DecisionBadge decision={item.decision} />
                      </TableCell>
                      <TableCell>
                        <DeciderBadge decider={item.decidedBy} />
                      </TableCell>
                      <TableCell>
                        <CategoryChips categories={item.categories} />
                      </TableCell>
                      <TableCell>
                        <Excerpt item={item} />
                      </TableCell>
                      <TableCell className="text-ink-600 text-right text-xs tabular-nums">
                        {item.latencyMs === null ? "—" : `${formatNumber(item.latencyMs)} ms`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {data && data.totalCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-ink-500 text-sm" aria-live="polite">
                {t("admin.contentSafety.pagination.checksRange", {
                  from: formatNumber(first),
                  to: formatNumber(last),
                  total: formatNumber(data.totalCount),
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || checks.isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft aria-hidden="true" />
                  {t("admin.contentSafety.pagination.previous")}
                </Button>
                <span className="text-ink-600 text-sm tabular-nums">
                  {t("admin.contentSafety.pagination.pageOf", { current: data.pageNumber, total: Math.max(1, data.totalPages) })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages || checks.isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  {t("admin.contentSafety.pagination.next")}
                  <ChevronRight aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Section>

      <CheckDetailSheet
        checkId={openCheck}
        onClose={() => setOpenCheck(null)}
        onAllowlist={(phrase, note) => setAllowTarget({ phrase, note })}
      />
      <AllowlistDialog target={allowTarget} onClose={() => setAllowTarget(null)} />
    </div>
  );
};
