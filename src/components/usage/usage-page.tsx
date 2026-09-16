"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink } from "lucide-react";

import { PageLoading } from "@/components/commons/layout/page-loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useUsageOverview } from "@/hooks/queries/use-usage-overview";

const ranges = [
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "12 months", days: 365 },
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
          [row.provider, row.service, row.requests, row.estimatedCostUsd, row.sharePercent].join(
            ","
          )
        ),
      ];
      const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `usage-${days}d.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("We couldn't export your usage details. Please try again.");
    }
  };
  if (isLoading) return <PageLoading label="Loading usage" />;
  if (isError || !data)
    return (
      <div className="space-y-2 p-6">
        <h1 className="text-base font-semibold">Usage is temporarily unavailable</h1>
        <p className="text-muted-foreground text-sm">
          We couldn&apos;t load your usage details. Please refresh the page and try again.
        </p>
      </div>
    );
  const max = Math.max(...chart.map((item) => Math.max(item.images, item.videos)), 1);
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-xs">Seller &gt; Usage</p>
          <h1 className="mt-1 text-2xl font-semibold">Usage</h1>
          <p className="text-muted-foreground text-sm">
            Understand this month&apos;s production volume and estimated provider costs.
          </p>
        </div>
        <div className="flex rounded-full border p-1">
          {ranges.map((range) => (
            <button
              key={range.days}
              onClick={() => setDays(range.days)}
              className={`rounded-full px-3 py-1 text-xs ${days === range.days ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Design images", data.summary.images, "generated"],
          ["Videos rendered", data.summary.videos, "requests"],
          ["Listings exported", data.summary.listings, "published"],
          ["Estimated API cost", money.format(data.summary.estimatedCostUsd), "heuristic estimate"],
        ].map(([label, value, note]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
              <p className="text-muted-foreground text-xs">{note}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-widest">
              DAILY ACTIVITY
            </p>
            <CardTitle>Generation volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-end gap-px border-b border-l px-2">
              {chart.map((item) => (
                <div
                  key={item.date}
                  className="flex flex-1 items-end gap-px"
                  title={`${item.date}: ${item.images} images, ${item.videos} videos`}
                >
                  <div
                    className="bg-primary/80 w-1/2"
                    style={{ height: `${(item.images / max) * 100}%` }}
                  />
                  <div
                    className="bg-muted-foreground/50 w-1/2"
                    style={{ height: `${(item.videos / max) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="text-muted-foreground mt-2 flex justify-between text-[10px]">
              <span>Images</span>
              <span>Videos</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-widest">
              {data.allowance.planName}
            </p>
            <CardTitle className="flex justify-between">
              Credit allowance{" "}
              <Link href="/subscription" className="text-primary text-xs">
                Manage <ExternalLink className="inline size-3" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {data.allowance.used.toLocaleString()}{" "}
              <span className="text-muted-foreground text-sm font-normal">
                / {data.allowance.limit.toLocaleString()}
              </span>
            </p>
            <Progress value={data.allowance.percent} className="mt-3" />
            <p className="text-muted-foreground mt-2 text-xs">
              Resets {data.allowance.resetDate} · {data.allowance.daysRemaining} days remaining
            </p>
            <p
              className={`mt-4 rounded p-2 text-xs ${data.allowance.atRisk ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}
            >
              {data.allowance.atRisk ? "At risk" : "On track"} based on current usage pace.
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-widest">
              COST DETAIL
            </p>
            <CardTitle>By provider</CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="size-4" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground text-left text-[10px] uppercase">
                <tr>
                  {["Provider", "Service", "Requests", "Estimated cost", "Share"].map((heading) => (
                    <th key={heading} className="px-4 py-3">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.costs.map((row) => (
                  <tr key={`${row.provider}-${row.service}`} className="border-t">
                    <td className="px-4 py-3 font-medium">{row.provider}</td>
                    <td className="px-4 py-3">{row.service}</td>
                    <td className="px-4 py-3">{row.requests.toLocaleString()}</td>
                    <td className="px-4 py-3">{money.format(row.estimatedCostUsd)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Progress value={row.sharePercent} className="h-1.5 w-20" />
                        <span>{row.sharePercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.costs.length === 0 && (
              <p className="text-muted-foreground p-8 text-center text-sm">
                There&apos;s no usage activity in this time range yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
