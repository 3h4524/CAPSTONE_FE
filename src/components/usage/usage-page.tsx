"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  Database,
  Download,
  ExternalLink,
  Image as ImageIcon,
  Info,
  Layers,
  PlaySquare,
  ReceiptText,
  Sparkles,
  Store,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { PageHeader } from "@/components/commons/layout/page-header";
import { PageLoading } from "@/components/commons/layout/page-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { showToast } from "@/helpers/toast";
import { useUsageOverview } from "@/hooks/queries/use-usage-overview";
import { useIsPhone } from "@/hooks/use-is-phone";
import { formatDate } from "@/utils/format-date";

// The backend sends this name when the Seller has no subscription, which leaves them on the free allowance.
const NO_PLAN_NAME = "No active plan";

const ranges = [
  { labelKey: "usage.range30", days: 30 },
  { labelKey: "usage.range90", days: 90 },
  { labelKey: "usage.range365", days: 365 },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function UsagePage() {
  const isPhone = useIsPhone();
  const { t, i18n } = useTranslation("common");
  const [days, setDays] = useState(30);
  const { data, isLoading, isError } = useUsageOverview(days);
  const chart = useMemo(() => data?.dailyActivity ?? [], [data]);

  const exportCsv = () => {
    try {
      if (!data) return;
      const lines = [
        "Provider,Service,Requests,Estimated cost,Share",
        ...data.costs.map((row) =>
          [row.provider, row.service, row.requests, row.estimatedCostUsd, row.sharePercent].join(",")
        ),
      ];
      const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `usage-${days}d.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("error", t("usage.exportError"));
    }
  };

  if (isLoading) return <PageLoading label={t("usage.loadingUsage")} />;
  if (isError || !data)
    return (
      <div className="w-full min-w-0 space-y-2 p-4 sm:p-6">
        <h1 className="text-base font-semibold">{t("usage.unavailableTitle")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("usage.unavailableDescription")}
        </p>
      </div>
    );

  const max = Math.max(...chart.map((item) => Math.max(item.images, item.videos)), 1);
  const totalActivity = chart.reduce((sum, item) => sum + item.images + item.videos, 0);
  const activeRange = ranges.find((r) => r.days === days) ?? ranges[0];
  const hasPlan = Boolean(data.allowance.planName) && data.allowance.planName !== NO_PLAN_NAME;

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6 md:p-6">
      <PageHeader
        title={t("usage.pageTitle")}
        description={t("usage.pageDescription")}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-ink-200 text-ink-700 hover:bg-ink-50 h-9 gap-1.5 rounded-xl px-3.5 text-xs font-medium shadow-2xs"
              >
                {t(activeRange.labelKey)}
                <ChevronDown className="text-ink-500 size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 rounded-xl">
              {ranges.map((range) => (
                <DropdownMenuItem
                  key={range.days}
                  onClick={() => setDays(range.days)}
                  className={`text-xs ${days === range.days ? "text-primary font-semibold" : ""}`}
                >
                  {t(range.labelKey)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            labelKey: "usage.designImages",
            value: data.summary.images,
            noteKey: "usage.noteGenerated",
            phoneNoteKey: undefined,
            icon: ImageIcon,
          },
          {
            labelKey: "usage.videosRendered",
            value: data.summary.videos,
            noteKey: "usage.noteRequests",
            phoneNoteKey: undefined,
            icon: PlaySquare,
          },
          {
            labelKey: "usage.listingsExported",
            value: data.summary.listings,
            noteKey: "usage.notePublished",
            phoneNoteKey: undefined,
            icon: Store,
          },
          {
            labelKey: "usage.estimatedApiCost",
            value: money.format(data.summary.estimatedCostUsd),
            noteKey: "usage.noteHeuristic",
            phoneNoteKey: "usage.noteEstimated",
            icon: Database,
          },
        ].map(({ labelKey, value, noteKey, phoneNoteKey, icon: Icon }) => (
          <Card
            key={labelKey}
            className="group border-ink-200/80 hover:border-ink-300 flex-row items-center justify-between gap-3 rounded-2xl px-5 py-3.5 shadow-2xs transition duration-300 hover:-translate-y-0.5 hover:shadow-md max-sm:relative max-sm:items-start max-sm:px-3.5 max-sm:py-3"
          >
            <div className="min-w-0">
              <p className="text-muted-foreground truncate text-xs font-medium max-sm:pr-7 max-sm:whitespace-normal">{t(labelKey)}</p>
              <p className="text-ink-900 mt-1 text-2xl leading-tight font-semibold tracking-tight tabular-nums">
                {value}
              </p>
              <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                <span className="md:hidden">{t(phoneNoteKey ?? noteKey)}</span>
                <span className="max-md:hidden">{t(noteKey)}</span>
              </p>
            </div>
            <span className="bg-ink-100 ring-ink-200 flex size-10 shrink-0 items-center justify-center rounded-xl text-[#4f709c] ring-1 transition-transform duration-300 ring-inset group-hover:scale-110 max-sm:absolute max-sm:top-2.5 max-sm:right-2.5 max-sm:size-8 dark:text-[#a0b4cf]">
              <Icon className="size-5 max-sm:size-4" aria-hidden="true" />
            </span>
          </Card>
        ))}
      </div>

      {/* Middle Section */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Daily Activity / Generation volume */}
        <Card className="border-ink-200/80 rounded-2xl shadow-2xs">
          <CardHeader className="pb-3">
            <p className="text-ink-500 text-[10px] font-bold tracking-wider uppercase">
              {t("usage.dailyActivity")}
            </p>
            <h2 className="text-ink-900 mt-0.5 text-base font-bold">{t("usage.generationVolume")}</h2>
          </CardHeader>
          <CardContent className="pt-0">
            {totalActivity === 0 ? (
              <div className="py-2">
                <div className="border-ink-200 relative flex h-48 w-full items-center justify-center border-b border-l pl-4">
                  <div className="flex flex-col items-center justify-center text-center">
                    <BarChart3 className="text-ink-400 size-8 stroke-[1.5]" />
                    <p className="text-ink-900 mt-3 text-sm font-semibold">
                      {t("usage.noActivityTitle")}
                    </p>
                    <p className="text-ink-500 mt-0.5 text-xs">
                      {t("usage.noActivityDescription")}
                    </p>
                  </div>
                </div>
                <ul className="text-ink-600 mt-2 flex items-center justify-center gap-4 text-xs" aria-label={t("usage.chartLegend")}>
                  <li className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#2563eb]" aria-hidden="true" />
                    {t("usage.images")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="bg-ink-400 size-2.5 rounded-full" aria-hidden="true" />
                    {t("usage.videos")}
                  </li>
                </ul>
              </div>
            ) : (
              <div>
                <div className="border-ink-200 flex h-48 items-end gap-px border-b border-l px-2">
                  {chart.map((item) => (
                    <div
                      key={item.date}
                      className="flex h-full flex-1 items-end gap-px"
                      title={t("usage.barTitle", { date: item.date, images: item.images, videos: item.videos })}
                    >
                      <div
                        className="w-1/2 bg-[#2563eb]"
                        style={{ height: `${(item.images / max) * 100}%` }}
                      />
                      <div
                        className="bg-ink-400 w-1/2"
                        style={{ height: `${(item.videos / max) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
                <ul className="text-ink-600 mt-2 flex items-center justify-center gap-4 text-xs" aria-label={t("usage.chartLegend")}>
                  <li className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#2563eb]" aria-hidden="true" />
                    {t("usage.images")}
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="bg-ink-400 size-2.5 rounded-full" aria-hidden="true" />
                    {t("usage.videos")}
                  </li>
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI requests this period */}
        <Card className="border-ink-200/80 flex flex-col justify-between gap-0 rounded-2xl p-5 shadow-2xs max-md:order-first sm:p-6">
          <div>
            {/* Top row: Plan badge + Manage link */}
            <div className="flex items-center justify-between">
              <span className="border-ink-200/80 bg-ink-100/90 text-ink-600 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium">
                <span
                  className={`size-1.5 rounded-full ${hasPlan ? "bg-emerald-500" : "bg-ink-400"}`}
                  aria-hidden="true"
                />
                {hasPlan ? data.allowance.planName : t("usage.freePlan")}
              </span>
              <Link
                href="/subscription"
                className="max-md:text-primary inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t("usage.manage")} <ExternalLink className="size-3" />
              </Link>
            </div>

            {/* Title row: Sparkles icon + AI requests this period */}
            <div className="mt-3 flex items-center gap-3">
              <span className="bg-ink-100 ring-ink-200 flex size-10 shrink-0 items-center justify-center rounded-xl text-[#4f709c] ring-1 ring-inset dark:text-[#a0b4cf]">
                <Sparkles className="size-5" />
              </span>
              <h2 className="text-ink-900 text-base leading-tight font-bold">
                {t("usage.aiRequests")}
              </h2>
            </div>

            <div className="mt-5 flex items-baseline gap-2">
              <p className="text-ink-900 text-4xl font-bold tracking-tight">
                {data.allowance.used.toLocaleString()}
              </p>
              <span className="text-ink-600 text-sm font-medium">
                {t("usage.requestsThisPeriod")}
                {data.allowance.limit > 0 && ` / ${data.allowance.limit.toLocaleString()}`}
              </span>
            </div>

            <div className="text-ink-600 mt-3 flex items-center gap-2 text-xs">
              <CalendarDays className="text-ink-500 size-4 shrink-0" />
              <span>
                {t("usage.periodEnds", { date: formatDate(data.allowance.resetDate, i18n.language), days: data.allowance.daysRemaining })}
              </span>
            </div>

            {data.allowance.limit > 0 && (
              <Progress value={data.allowance.percent} className="mt-3" />
            )}
          </div>

          <div>
            {data.allowance.limit > 0 ? (
              <div
                className={`mt-4 flex items-center gap-2.5 rounded-xl p-3 text-xs ${
                  data.allowance.atRisk
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
                    : "bg-ink-100 text-ink-700"
                }`}
              >
                <Info className="text-ink-500 size-4 shrink-0" />
                <span>{data.allowance.atRisk ? t("usage.paceAtRisk") : t("usage.paceOnTrack")}</span>
              </div>
            ) : (
              <div className="bg-ink-100 text-ink-700 mt-4 flex items-center gap-2.5 rounded-xl p-3 text-xs">
                <Info className="text-ink-500 size-4 shrink-0" />
                {hasPlan ? (
                  <span>{t("usage.unlimitedFairUse")}</span>
                ) : (
                  <span>
                    {t("usage.freeAllowanceApplies")}{" "}
                    <Link href="/subscription" className="text-primary font-semibold underline underline-offset-2">
                      {t("usage.seePlans")}
                    </Link>
                  </span>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Table: Cost detail / By provider */}
      <Card className="border-ink-200/80 gap-0 overflow-hidden rounded-2xl py-0 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3.5">
            <span className="bg-ink-100 ring-ink-200 flex size-10 shrink-0 items-center justify-center rounded-xl text-[#4f709c] ring-1 ring-inset dark:text-[#a0b4cf]">
              <ReceiptText className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-ink-900 text-base font-bold">{t("usage.byProvider")}</h2>
                <span className="bg-ink-100 text-ink-600 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums">
                  {t("usage.serviceCount", { count: data.costs.length })}
                </span>
              </div>
              <p className="text-ink-500 mt-0.5 text-xs">
                {t("usage.byProviderDescription")}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={data.costs.length === 0}
            className="border-ink-200 text-ink-700 hover:bg-ink-50 h-8.5 gap-1.5 rounded-xl text-xs font-medium shadow-2xs disabled:opacity-40"
            onClick={exportCsv}
          >
            <Download className="size-3.5" /> {t("usage.exportCsv")}
          </Button>
        </div>
        {isPhone && data.costs.length > 0 ? (
          <ul className="divide-ink-100 border-ink-200/80 divide-y border-t">
            {data.costs.map((row) => (
              <li key={`${row.provider}-${row.service}`} className="space-y-1.5 px-5 py-3.5 text-sm">
                <p className="flex justify-between gap-3">
                  <span className="text-ink-900 font-medium">{row.provider}</span>
                  <span className="text-ink-600 text-right">{row.service}</span>
                </p>
                <p className="flex justify-between gap-3">
                  <span className="text-ink-600">{t("usage.requestsWithCount", { count: row.requests.toLocaleString() })}</span>
                  <span className="text-ink-900">{money.format(row.estimatedCostUsd)}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Progress value={row.sharePercent} className="h-1.5 flex-1" />
                  <span className="text-ink-600 text-xs">{row.sharePercent}%</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm max-md:hidden">
            <thead className="border-ink-200/80 bg-ink-100 text-ink-700 border-y text-[10px] font-bold tracking-wider uppercase">
              <tr>
                {[t("usage.tableProvider"), t("usage.tableService"), t("usage.tableRequests"), t("usage.tableEstimatedCost"), t("usage.tableShare")].map(
                  (heading) => (
                    <th key={heading} className="px-5 py-3">
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>
            {data.costs.length > 0 && (
              <tbody className="divide-ink-100 divide-y">
                {data.costs.map((row) => (
                  <tr key={`${row.provider}-${row.service}`} className="hover:bg-ink-50/50">
                    <td className="text-ink-900 px-5 py-3.5 font-medium">{row.provider}</td>
                    <td className="text-ink-600 px-5 py-3.5">{row.service}</td>
                    <td className="text-ink-600 px-5 py-3.5">
                      {row.requests.toLocaleString()}
                    </td>
                    <td className="text-ink-900 px-5 py-3.5">
                      {money.format(row.estimatedCostUsd)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Progress value={row.sharePercent} className="h-1.5 w-20" />
                        <span className="text-ink-600 text-xs">{row.sharePercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {data.costs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Layers className="text-ink-300 size-8 stroke-[1.5]" />
              <p className="text-ink-600 mt-3 text-xs">
                {t("usage.noUsageInRange")}
              </p>
            </div>
          )}
        </div>
        )}
      </Card>
    </div>
  );
}
