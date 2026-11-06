import { BarChart3, Clock3, DollarSign, Heart, Layers3, Store } from "lucide-react";

import type { MarketQueryMetrics } from "@/api/market-insights";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import { MetricCard } from "./metric-card";

type MarketInsightResultsProps = {
  data: MarketQueryMetrics;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const formatNumber = (value: number | null) => value === null ? "—" : value.toLocaleString();
const formatDecimal = (value: number | null) => value === null ? "—" : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString() : "—";

const confidenceStyle: Record<MarketQueryMetrics["confidence"], string> = {
  low: "border-amber-200 bg-amber-50 text-amber-700",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export function MarketInsightResults({ data }: MarketInsightResultsProps) {
  const qualityPercent = data.rawSnapshotCount > 0
    ? Math.round((data.eligibleSnapshotCount / data.rawSnapshotCount) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <Card className="border-primary/15 from-primary/[0.07] via-card to-secondary/[0.07] overflow-hidden bg-gradient-to-br">
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">Market signal</p>
            <h2 className="mt-1 text-xl font-semibold capitalize">{data.query}</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
              Public Etsy listing signals aggregated from {data.observationPeriodCount} observation period{data.observationPeriodCount === 1 ? "" : "s"}.
            </p>
          </div>
          <Badge variant="outline" className={confidenceStyle[data.confidence]}>
            {data.confidence} confidence
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Listings" value={formatNumber(data.distinctListingCount)} note="Distinct current listings" icon={<Layers3 className="size-4" />} />
        <MetricCard label="Sellers" value={formatNumber(data.distinctSellerCount)} note="Distinct public shops" icon={<Store className="size-4" />} />
        <MetricCard label="Median price" value={data.medianPrice === null ? "—" : money.format(data.medianPrice)} note="Observed listing prices" icon={<DollarSign className="size-4" />} />
        <MetricCard label="Average favorites" value={formatDecimal(data.averageFavorites)} note="Engagement proxy" icon={<Heart className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">Data quality</p>
            <CardTitle>Can this signal be trusted yet?</CardTitle>
            <CardDescription>Quality reflects sample size and observation history, not buyer demand.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-3xl font-semibold">{qualityPercent}%</p><p className="text-muted-foreground text-xs">of snapshots passed the metric filter</p></div>
              <p className="text-muted-foreground text-right text-xs">{data.eligibleSnapshotCount.toLocaleString()} eligible / {data.rawSnapshotCount.toLocaleString()} raw</p>
            </div>
            <Progress value={qualityPercent} className="h-2" />
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="bg-muted/60 rounded-lg p-3"><p className="text-muted-foreground text-xs">Rejected</p><p className="mt-1 font-semibold">{data.rejectedSnapshotCount.toLocaleString()}</p></div>
              <div className="bg-muted/60 rounded-lg p-3"><p className="text-muted-foreground text-xs">Periods</p><p className="mt-1 font-semibold">{data.observationPeriodCount.toLocaleString()}</p></div>
              <div className="bg-muted/60 rounded-lg p-3"><p className="text-muted-foreground text-xs">New listings</p><p className="mt-1 font-semibold">{data.newListingCount.toLocaleString()}</p></div>
            </div>
            <p className="text-muted-foreground flex items-center gap-2 text-xs"><Clock3 className="size-3.5" /> {formatDate(data.firstObservedAt)} — {formatDate(data.lastObservedAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">Market signals</p>
            <CardTitle>Observed activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3 text-sm"><span className="text-muted-foreground">Average views</span><span className="font-semibold">{formatDecimal(data.averageViews)}</span></div>
            <div className="flex items-center justify-between border-b pb-3 text-sm"><span className="text-muted-foreground">New listings</span><span className="font-semibold">{data.newListingCount.toLocaleString()}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Observation periods</span><span className="font-semibold">{data.observationPeriodCount.toLocaleString()}</span></div>
            <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">Favorites and views are public listing signals. They are not Etsy search volume, sales, or revenue.</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">Keyword surface</p>
            <CardTitle>Top tags</CardTitle>
            <CardDescription>Tags appearing across the current listing sample.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topTags.length > 0 ? (
              <div className="space-y-3">
                {data.topTags.map((tag) => {
                  const max = data.topTags[0]?.listingCount ?? 1;
                  return <div key={tag.tag}><div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="truncate">{tag.tag}</span><span className="text-muted-foreground text-xs">{tag.listingCount}</span></div><Progress value={(tag.listingCount / max) * 100} className="h-1.5" /></div>;
                })}
              </div>
            ) : <p className="text-muted-foreground text-sm">No tag data is available yet.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">Next layer</p>
            <CardTitle>From metrics to insight</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3"><BarChart3 className="text-primary mt-0.5 size-4 shrink-0" /><p><span className="font-medium">Trend:</span> compare this query across observation periods.</p></div>
            <div className="flex gap-3"><Store className="text-primary mt-0.5 size-4 shrink-0" /><p><span className="font-medium">Competition:</span> combine listing and seller counts with growth.</p></div>
            <div className="flex gap-3"><Heart className="text-primary mt-0.5 size-4 shrink-0" /><p><span className="font-medium">Demand proxy:</span> use engagement density without claiming actual sales.</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
