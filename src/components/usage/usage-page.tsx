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

const ranges = [
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Last 12 months", days: 365 },
];

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function UsagePage() {
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

  return (
    <div className="w-full min-w-0 space-y-6 p-4 sm:p-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Usage</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Understand this month&apos;s production volume and estimated provider costs.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-xl border-slate-200 px-3.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              {activeRange.label}
              <ChevronDown className="size-3.5 text-slate-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 rounded-xl">
            {ranges.map((range) => (
              <DropdownMenuItem
                key={range.days}
                onClick={() => setDays(range.days)}
                className={`text-xs ${days === range.days ? "font-semibold text-primary" : ""}`}
              >
                {range.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Top 4 KPI Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
            icon: Database,
          },
        ].map(({ label, value, note, icon: Icon }) => (
          <Card
            key={label}
            className="group flex-row items-center justify-between gap-3 rounded-2xl border-slate-200/80 px-5 py-3.5 shadow-2xs transition duration-300 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            <div className="min-w-0">
              <p className="text-muted-foreground truncate text-xs font-medium">{label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 leading-tight tabular-nums">
                {value}
              </p>
              <p className="text-muted-foreground truncate text-[11px] mt-0.5">{note}</p>
            </div>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eef4fb] text-[#4f709c] ring-1 ring-[#dbe7f4] ring-inset transition-transform duration-300 group-hover:scale-110">
              <Icon className="size-5" aria-hidden="true" />
            </span>
          </Card>
        ))}
      </div>

      {/* Middle Section */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Daily Activity / Generation volume */}
        <Card className="rounded-2xl border-slate-200/80 shadow-2xs">
          <CardHeader className="pb-3">
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              DAILY ACTIVITY
            </p>
            <h2 className="mt-0.5 text-base font-bold text-slate-900">Generation volume</h2>
          </CardHeader>
          <CardContent className="pt-0">
            {totalActivity === 0 ? (
              <div className="py-2">
                <div className="relative flex h-48 w-full items-center justify-center border-b border-l border-slate-200 pl-4">
                  <span className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-medium text-slate-400">
                    Images
                  </span>
                  <div className="flex flex-col items-center justify-center text-center">
                    <BarChart3 className="size-8 text-slate-400 stroke-[1.5]" />
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      No generation activity yet
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Start a workflow to see usage here.
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-center text-[10px] font-medium text-slate-400">
                  <span>Videos</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex h-48 items-end gap-px border-b border-l border-slate-200 px-2">
                  {chart.map((item) => (
                    <div
                      key={item.date}
                      className="flex flex-1 items-end gap-px"
                      title={`${item.date}: ${item.images} images, ${item.videos} videos`}
                    >
                      <div
                        className="w-1/2 bg-[#2563eb]"
                        style={{ height: `${(item.images / max) * 100}%` }}
                      />
                      <div
                        className="w-1/2 bg-[#94a3b8]"
                        style={{ height: `${(item.videos / max) * 100}%` }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-center text-[10px] font-medium text-slate-400">
                  <span>Videos</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI requests this period */}
        <Card className="rounded-2xl border-slate-200/80 p-5 sm:p-6 shadow-2xs gap-0 flex flex-col justify-between">
          <div>
            {/* Top row: Plan badge + Manage link */}
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-100/90 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                <span
                  className={`size-1.5 rounded-full ${
                    data.allowance.planName ? "bg-emerald-500" : "bg-slate-400"
                  }`}
                  aria-hidden="true"
                />
                {data.allowance.planName || "No active plan"}
              </span>
              <Link
                href="/subscription"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Manage <ExternalLink className="size-3" />
              </Link>
            </div>

            {/* Title row: Sparkles icon + AI requests this period */}
            <div className="mt-3 flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eff4fa] text-[#4f709c] ring-1 ring-[#dbe7f4] ring-inset">
                <Sparkles className="size-5" />
              </span>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                AI requests this period
              </h2>
            </div>

            <div className="mt-5 flex items-baseline gap-2">
              <p className="text-4xl font-bold tracking-tight text-slate-900">
                {data.allowance.used.toLocaleString()}
              </p>
              <span className="text-sm font-medium text-slate-600">
                requests this period
                {data.allowance.limit > 0 && ` / ${data.allowance.limit.toLocaleString()}`}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
              <CalendarDays className="size-4 text-slate-500 shrink-0" />
              <span>
                Period ends {data.allowance.resetDate} · {data.allowance.daysRemaining} days remaining
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
                    ? "bg-rose-50 text-rose-700"
                    : "bg-[#eff4fa] text-slate-700"
                }`}
              >
                <Info className="size-4 shrink-0 text-slate-500" />
                <span>{data.allowance.atRisk ? "At risk" : "On track"} based on current usage pace.</span>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#eff4fa] p-3 text-xs text-slate-700">
                <Info className="size-4 shrink-0 text-slate-500" />
                <span>No monthly limit. Fair use applies.</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Table: Cost detail / By provider */}
      <Card className="rounded-2xl border-slate-200/80 shadow-2xs gap-0 py-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eff4fa] text-[#4f709c] ring-1 ring-[#dbe7f4] ring-inset">
              <ReceiptText className="size-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">By provider</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">
                  {data.costs.length} {data.costs.length === 1 ? "service" : "services"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Track requests and estimated expenditure per connected provider
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={data.costs.length === 0}
            className="h-8.5 gap-1.5 rounded-xl border-slate-200 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40"
            onClick={exportCsv}
          >
            <Download className="size-3.5" /> Export CSV
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-t border-b border-slate-200/80 bg-[#f1f5f9] text-[10px] font-bold tracking-wider text-slate-700 uppercase">
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
              <tbody className="divide-y divide-slate-100">
                {data.costs.map((row) => (
                  <tr key={`${row.provider}-${row.service}`} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 font-medium text-slate-900">{row.provider}</td>
                    <td className="px-5 py-3.5 text-slate-600">{row.service}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {row.requests.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-slate-900">
                      {money.format(row.estimatedCostUsd)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Progress value={row.sharePercent} className="h-1.5 w-20" />
                        <span className="text-xs text-slate-600">{row.sharePercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
          {data.costs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Layers className="size-8 text-slate-300 stroke-[1.5]" />
              <p className="mt-3 text-xs text-slate-600">
                There&apos;s no usage activity in this time range yet.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
