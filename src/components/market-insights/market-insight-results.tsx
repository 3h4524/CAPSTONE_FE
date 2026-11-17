import { BarChart3, Clock3, DollarSign, Heart, Layers3, Store } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { MarketQueryMetrics } from "@/api/market-insights";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { i18n } from "@/i18n/client";

import { MetricCard } from "./metric-card";

type MarketInsightResultsProps = {
  data: MarketQueryMetrics;
};

const formatMoney = (value: number) => new Intl.NumberFormat(i18n.language, { style: "currency", currency: "USD" }).format(value);
const formatNumber = (value: number | null) => value === null ? "—" : value.toLocaleString(i18n.language);
const formatDecimal = (value: number | null) => value === null ? "—" : value.toLocaleString(i18n.language, { maximumFractionDigits: 2 });
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString(i18n.language) : "—";

const confidenceStyle: Record<MarketQueryMetrics["confidence"], string> = {
  low: "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
  medium: "border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300",
  high: "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

export function MarketInsightResults({ data }: MarketInsightResultsProps) {
  const { t } = useTranslation("common");
  const qualityPercent = data.rawSnapshotCount > 0
    ? Math.round((data.eligibleSnapshotCount / data.rawSnapshotCount) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <Card className="border-primary/15 from-primary/[0.07] via-card to-secondary/[0.07] overflow-hidden bg-gradient-to-br">
        <CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">{t("marketInsights.results.marketSignal")}</p>
            <h2 className="mt-1 text-xl font-semibold capitalize">{data.query}</h2>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
              {t("marketInsights.results.aggregated", { count: data.observationPeriodCount })}
            </p>
          </div>
          <Badge variant="outline" className={confidenceStyle[data.confidence]}>
            {t(`marketInsights.results.confidence.${data.confidence}`, { defaultValue: `${data.confidence} confidence` })}
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={t("marketInsights.results.listings")} value={formatNumber(data.distinctListingCount)} note={t("marketInsights.results.listingsNote")} icon={<Layers3 className="size-4" />} />
        <MetricCard label={t("marketInsights.results.sellers")} value={formatNumber(data.distinctSellerCount)} note={t("marketInsights.results.sellersNote")} icon={<Store className="size-4" />} />
        <MetricCard label={t("marketInsights.results.medianPrice")} value={data.medianPrice === null ? "—" : formatMoney(data.medianPrice)} note={t("marketInsights.results.medianPriceNote")} icon={<DollarSign className="size-4" />} />
        <MetricCard label={t("marketInsights.results.averageFavorites")} value={formatDecimal(data.averageFavorites)} note={t("marketInsights.results.averageFavoritesNote")} icon={<Heart className="size-4" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">{t("marketInsights.results.dataQuality")}</p>
            <CardTitle>{t("marketInsights.results.trusted")}</CardTitle>
            <CardDescription>{t("marketInsights.results.qualityDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div><p className="text-3xl font-semibold">{qualityPercent}%</p><p className="text-muted-foreground text-xs">{t("marketInsights.results.passedFilter")}</p></div>
              <p className="text-muted-foreground text-right text-xs">{t("marketInsights.results.eligibleRaw", { eligible: formatNumber(data.eligibleSnapshotCount), raw: formatNumber(data.rawSnapshotCount) })}</p>
            </div>
            <Progress value={qualityPercent} className="h-2" />
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="bg-muted/60 rounded-lg p-3"><p className="text-muted-foreground text-xs">{t("marketInsights.results.rejected")}</p><p className="mt-1 font-semibold">{formatNumber(data.rejectedSnapshotCount)}</p></div>
              <div className="bg-muted/60 rounded-lg p-3"><p className="text-muted-foreground text-xs">{t("marketInsights.results.periods")}</p><p className="mt-1 font-semibold">{formatNumber(data.observationPeriodCount)}</p></div>
              <div className="bg-muted/60 rounded-lg p-3"><p className="text-muted-foreground text-xs">{t("marketInsights.results.newListings")}</p><p className="mt-1 font-semibold">{formatNumber(data.newListingCount)}</p></div>
            </div>
            <p className="text-muted-foreground flex items-center gap-2 text-xs"><Clock3 className="size-3.5" /> {formatDate(data.firstObservedAt)} — {formatDate(data.lastObservedAt)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">{t("marketInsights.results.marketSignals")}</p>
            <CardTitle>{t("marketInsights.results.observedActivity")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b pb-3 text-sm"><span className="text-muted-foreground">{t("marketInsights.results.averageViews")}</span><span className="font-semibold">{formatDecimal(data.averageViews)}</span></div>
            <div className="flex items-center justify-between border-b pb-3 text-sm"><span className="text-muted-foreground">{t("marketInsights.results.newListings")}</span><span className="font-semibold">{formatNumber(data.newListingCount)}</span></div>
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{t("marketInsights.results.observationPeriods")}</span><span className="font-semibold">{formatNumber(data.observationPeriodCount)}</span></div>
            <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{t("marketInsights.results.signalsDisclaimer")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">{t("marketInsights.results.keywordSurface")}</p>
            <CardTitle>{t("marketInsights.results.topTags")}</CardTitle>
            <CardDescription>{t("marketInsights.results.topTagsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topTags.length > 0 ? (
              <div className="space-y-3">
                {data.topTags.map((tag) => {
                  const max = data.topTags[0]?.listingCount ?? 1;
                  return <div key={tag.tag}><div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="truncate">{tag.tag}</span><span className="text-muted-foreground text-xs">{tag.listingCount}</span></div><Progress value={(tag.listingCount / max) * 100} className="h-1.5" /></div>;
                })}
              </div>
            ) : <p className="text-muted-foreground text-sm">{t("marketInsights.results.noTags")}</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.18em] uppercase">{t("marketInsights.results.nextLayer")}</p>
            <CardTitle>{t("marketInsights.results.metricsToInsight")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex gap-3"><BarChart3 className="text-primary mt-0.5 size-4 shrink-0" /><p><span className="font-medium">{t("marketInsights.results.trend")}</span> {t("marketInsights.results.trendText")}</p></div>
            <div className="flex gap-3"><Store className="text-primary mt-0.5 size-4 shrink-0" /><p><span className="font-medium">{t("marketInsights.results.competition")}</span> {t("marketInsights.results.competitionText")}</p></div>
            <div className="flex gap-3"><Heart className="text-primary mt-0.5 size-4 shrink-0" /><p><span className="font-medium">{t("marketInsights.results.demandProxy")}</span> {t("marketInsights.results.demandProxyText")}</p></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
