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

// The backend sends this name when the Seller has no subscription, which leaves them on the free allowance.
const NO_PLAN_NAME = "No active plan";

const formatResetDate = (value: string) =>
  new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));

const ranges = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 12 months", days: 365 },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function UsagePage() {
  const isPhone = useIsPhone();
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
      showToast("error", "We couldn't export your usage details. Please try again.");
    }
  };

  if (isLoading) return <PageLoading label="Loading usage" />;
  if (isError || !data)
    return (
      <div className="w-full min-w-0 space-y-2 p-4 sm:p-6">
        <h1 className="text-base font-semibold">Usage is temporarily unavailable</h1>
        <p className="text-muted-foreground text-sm">
          We couldn&apos;t load your usage details. Please refresh the page and try again.
        </p>
      </div>
    );

  const max = Math.max(...chart.map((item) => Math.max(item.images, item.videos)), 1);
  const totalActivity = chart.reduce((sum, item) => sum + item.images + item.videos, 0);
  const activeRange = ranges.find((r) => r.days === days) ?? ranges[0];
  const hasPlan = Boolean(data.allowance.planName) && data.allowance.planName !== NO_PLAN_NAME;

  return (
    <div className="w-full min-w-0 space-y-4 md:space-y-6 md:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-ink-900 text-2xl font-bold tracking-tight max-md:text-xl sm:text-3xl">Usage</h1>
          <p className="text-muted-foreground mt-1 text-sm max-md:hidden">
            Understand this month&apos;s production volume and estimated provider costs.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="border-ink-200 text-ink-700 hover:bg-ink-50 h-9 gap-1.5 rounded-xl px-3.5 text-xs font-medium shadow-2xs"
            >
              {activeRange.label}
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
                {range.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Design images",
            value: data.summary.images,
            note: "generated",
            icon: ImageIcon,
          },
          {
            label: "Videos rendered",
            value: data.summary.videos,
            note: "requests",
            icon: PlaySquare,
          },
          {
            label: "Listings exported",
            value: data.summary.listings,
            note: "published",
            icon: Store,
          },
          {
            label: "Estimated API cost",
            value: money.format(data.summary.estimatedCostUsd),
            note: "heuristic estimate",
            phoneNote: "estimated",
            icon: Database,
          },
        ].map(({ label, value, note, phoneNote, icon: Icon }) => (
          <Card
            key={label}
            className="group border-ink-200/80 hover:border-ink-300 flex-row items-center justify-between gap-3 rounded-2xl px-5 py-3.5 shadow-2xs transition duration-300 hover:-translate-y-0.5 hover:shadow-md max-sm:relative max-sm:items-start max-sm:px-3.5 max-sm:py-3"
          >
            <div className="min-w-0">
              <p className="text-muted-foreground truncate text-xs font-medium max-sm:pr-7 max-sm:whitespace-normal">{label}</p>
              <p className="text-ink-900 mt-1 text-2xl leading-tight font-semibold tracking-tight tabular-nums">
                {value}
              </p>
              <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                <span className="md:hidden">{phoneNote ?? note}</span>
                <span className="max-md:hidden">{note}</span>
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
              DAILY ACTIVITY
            </p>
            <h2 className="text-ink-900 mt-0.5 text-base font-bold">Generation volume</h2>
          </CardHeader>
          <CardContent className="pt-0">
            {totalActivity === 0 ? (
              <div className="py-2">
                <div className="border-ink-200 relative flex h-48 w-full items-center justify-center border-b border-l pl-4">
                  <div className="flex flex-col items-center justify-center text-center">
                    <BarChart3 className="text-ink-400 size-8 stroke-[1.5]" />
                    <p className="text-ink-900 mt-3 text-sm font-semibold">
                      No generation activity yet
                    </p>
                    <p className="text-ink-500 mt-0.5 text-xs">
                      Start a workflow to see usage here.
                    </p>
                  </div>
                </div>
                <ul className="text-ink-600 mt-2 flex items-center justify-center gap-4 text-xs" aria-label="Chart legend">
                  <li className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#2563eb]" aria-hidden="true" />
                    Images
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="bg-ink-400 size-2.5 rounded-full" aria-hidden="true" />
                    Videos
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
                      title={`${item.date}: ${item.images} images, ${item.videos} videos`}
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
                <ul className="text-ink-600 mt-2 flex items-center justify-center gap-4 text-xs" aria-label="Chart legend">
                  <li className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#2563eb]" aria-hidden="true" />
                    Images
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="bg-ink-400 size-2.5 rounded-full" aria-hidden="true" />
                    Videos
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
                {hasPlan ? data.allowance.planName : "Free plan"}
              </span>
              <Link
                href="/subscription"
                className="max-md:text-primary inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
              >
                Manage <ExternalLink className="size-3" />
              </Link>
            </div>

            {/* Title row: Sparkles icon + AI requests this period */}
            <div className="mt-3 flex items-center gap-3">
              <span className="bg-ink-100 ring-ink-200 flex size-10 shrink-0 items-center justify-center rounded-xl text-[#4f709c] ring-1 ring-inset dark:text-[#a0b4cf]">
                <Sparkles className="size-5" />
              </span>
              <h2 className="text-ink-900 text-base leading-tight font-bold">
                AI requests this period
              </h2>
            </div>

            <div className="mt-5 flex items-baseline gap-2">
              <p className="text-ink-900 text-4xl font-bold tracking-tight">
                {data.allowance.used.toLocaleString()}
              </p>
              <span className="text-ink-600 text-sm font-medium">
                requests this period
                {data.allowance.limit > 0 && ` / ${data.allowance.limit.toLocaleString()}`}
              </span>
            </div>

            <div className="text-ink-600 mt-3 flex items-center gap-2 text-xs">
              <CalendarDays className="text-ink-500 size-4 shrink-0" />
              <span>
                Period ends <span className="max-md:hidden">{data.allowance.resetDate}</span>
                <span className="md:hidden">{formatResetDate(data.allowance.resetDate)}</span> · {data.allowance.daysRemaining} days remaining
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
                <span>{data.allowance.atRisk ? "At risk" : "On track"} based on current usage pace.</span>
              </div>
            ) : (
              <div className="bg-ink-100 text-ink-700 mt-4 flex items-center gap-2.5 rounded-xl p-3 text-xs">
                <Info className="text-ink-500 size-4 shrink-0" />
                {hasPlan ? (
                  <span>No monthly limit. Fair use applies.</span>
                ) : (
                  <span>
                    Free allowance applies.{" "}
                    <Link href="/subscription" className="text-primary font-semibold underline underline-offset-2">
                      See plans
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
                <h2 className="text-ink-900 text-base font-bold">By provider</h2>
                <span className="bg-ink-100 text-ink-600 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums">
                  {data.costs.length} {data.costs.length === 1 ? "service" : "services"}
                </span>
              </div>
              <p className="text-ink-500 mt-0.5 text-xs">
                Track requests and estimated expenditure per connected provider
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
            <Download className="size-3.5" /> Export CSV
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
                  <span className="text-ink-600">Requests: {row.requests.toLocaleString()}</span>
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
                {["PROVIDER", "SERVICE", "REQUESTS", "ESTIMATED COST", "SHARE"].map(
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
                There&apos;s no usage activity in this time range yet.
              </p>
            </div>
          )}
        </div>
        )}
      </Card>
    </div>
  );
}
