"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { TFunction } from "i18next";
import { ArrowUpRight, ChartNoAxesCombined, CircleDollarSign, Lightbulb, Search, Sparkles, Target } from "lucide-react";
import { useTranslation } from "react-i18next";

import { listSellerOpportunities, type SellerOpportunity } from "@/api/market-opportunities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuthStore } from "@/stores/auth";
import { useQuery } from "@tanstack/react-query";

const opportunitiesKey = ["growth-insights", "seller-opportunities"] as const;

const scoreTone = (score: number) =>
  score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-300" : "text-slate-300";

const formatNumber = (value: number, locale: string) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);

export function GrowthInsights({ opportunities: providedOpportunities }: { opportunities?: SellerOpportunity[] }) {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.language;
  const userId = useAuthStore((state) => state.user?.id);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const query = useQuery({
    queryKey: [...opportunitiesKey, userId],
    queryFn: () => listSellerOpportunities(),
    enabled: !providedOpportunities && isHydrated && Boolean(userId),
  });

  const opportunities = useMemo(() => providedOpportunities ?? query.data ?? [], [providedOpportunities, query.data]);
  const metrics = useMemo(() => {
    if (opportunities.length === 0) return { averageScore: 0, evidence: 0, engagement: 0, supported: 0 };
    const withEngagement = opportunities.filter((item) => item.insights.engagementRate != null);
    const averageScore = opportunities.reduce((sum, item) => sum + item.finalScore, 0) / opportunities.length;
    const engagement = withEngagement.length
      ? withEngagement.reduce((sum, item) => sum + (item.insights.engagementRate ?? 0), 0) / withEngagement.length
      : 0;
    const evidence = opportunities.reduce((sum, item) => sum + item.insights.observationPeriodCount, 0);
    const supported = opportunities.filter((item) => item.insights.evidenceQuality === "supported").length;
    return { averageScore, evidence, engagement, supported };
  }, [opportunities]);

  const feed = useMemo(() => buildFeed(opportunities, t), [opportunities, t]);

  if (!providedOpportunities && query.isPending) {
    return <div className="h-96 animate-pulse rounded-3xl border border-slate-800 bg-slate-950/90" aria-label={t("dashboard.growth.loadingAria")} />;
  }

  if (!providedOpportunities && query.isError) {
    return (
      <Card className="border-rose-900/60 bg-slate-950 p-6 text-slate-100">
        <p className="font-semibold">{t("dashboard.growth.loadErrorTitle")}</p>
        <p className="mt-2 text-sm text-slate-400">{t("dashboard.growth.loadErrorHint")}</p>
      </Card>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#080b0d] text-slate-100 shadow-2xl shadow-slate-950/20">
      <div className="border-b border-slate-800/90 p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-500 uppercase">{t("dashboard.growth.eyebrow")}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{t("dashboard.growth.title")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{t("dashboard.growth.description")}</p>
          </div>
          <Badge className="border-emerald-900/70 bg-emerald-950/70 px-3 py-1.5 text-emerald-300"><Sparkles />{t("dashboard.growth.advisorBadge")}</Badge>
        </div>

        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <ProxyMetric label={t("dashboard.growth.metricOpportunities")} value={formatNumber(opportunities.length, locale)} detail={t("dashboard.growth.metricOpportunitiesDetail")} icon={<Target />} tone="text-emerald-400" />
          <ProxyMetric label={t("dashboard.growth.metricFit")} value={`${Math.round(metrics.averageScore)}/100`} detail={t("dashboard.growth.metricFitDetail")} icon={<ChartNoAxesCombined />} tone={scoreTone(metrics.averageScore)} />
          <ProxyMetric label={t("dashboard.growth.metricEngagement")} value={`${metrics.engagement.toFixed(1)}%`} detail={t("dashboard.growth.metricEngagementDetail")} icon={<ArrowUpRight />} tone="text-emerald-400" />
          <ProxyMetric label={t("dashboard.growth.metricEvidence")} value={formatNumber(metrics.evidence, locale)} detail={t("dashboard.growth.metricEvidenceDetail", { count: metrics.supported })} icon={<CircleDollarSign />} tone="text-amber-300" />
        </div>
        <p className="mt-6 text-xs text-slate-500">{t("dashboard.growth.disclaimer")}</p>
      </div>

      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-medium">{t("dashboard.growth.feedTitle")}</h3>
            <p className="mt-1 text-sm text-slate-500">{t("dashboard.growth.feedDescription")}</p>
          </div>
          <span className="text-xs text-slate-500">{t("dashboard.growth.insightsCount", { count: feed.length })}</span>
        </div>

        {feed.length > 0 ? (
          <div className="mt-5 space-y-3">
            {feed.map((item) => <OpportunityFeedItem key={item.title} item={item} />)}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">
            {t("dashboard.growth.feedEmpty")}
          </div>
        )}

        <Button asChild variant="outline" className="mt-5 border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white">
          <Link href="/market-opportunities">{t("dashboard.growth.openRadar")} <ArrowUpRight /></Link>
        </Button>
      </div>
    </section>
  );
}

function ProxyMetric({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: string }) {
  return <div><div className="flex items-center gap-2 text-xs text-slate-500">{icon}<span>{label}</span></div><p className={`mt-2 text-2xl font-medium tabular-nums ${tone}`}>{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>;
}

type FeedItem = { title: string; description: string; tag: string; icon: "growth" | "keyword" | "differentiate"; opportunityId?: string };

function OpportunityFeedItem({ item }: { item: FeedItem }) {
  const Icon = item.icon === "keyword" ? Search : item.icon === "differentiate" ? Lightbulb : ArrowUpRight;
  return <Link href={item.opportunityId ? `/market-opportunities?opportunity=${item.opportunityId}` : "/market-opportunities"} className="group block rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-emerald-800/80 hover:bg-slate-900/80"><div className="flex gap-3"><Icon className="mt-0.5 size-5 shrink-0 text-emerald-400" /><div className="min-w-0"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-medium text-slate-100 group-hover:text-emerald-300">{item.title}</h4><ArrowUpRight className="size-4 text-slate-600 group-hover:text-emerald-400" /></div><p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p><span className="mt-3 inline-flex rounded-full bg-slate-800 px-2.5 py-1 text-[11px] text-slate-300">{item.tag}</span></div></div></Link>;
}

function buildFeed(opportunities: SellerOpportunity[], t: TFunction): FeedItem[] {
  if (opportunities.length === 0) return [];
  const top = [...opportunities].sort((a, b) => b.finalScore - a.finalScore)[0];
  const keyword = [...opportunities].sort((a, b) => b.marketOpportunityScore - a.marketOpportunityScore).find((item) => item.id !== top.id) ?? top;
  const differentiate = [...opportunities].sort((a, b) => (b.insights.distinctListingCount - a.insights.distinctListingCount) || (b.finalScore - a.finalScore))[0];
  return [
    { title: t("dashboard.growth.feed.growth.title"), description: t("dashboard.growth.feed.growth.description", { niche: top.niche, score: Math.round(top.finalScore), count: top.insights.distinctListingCount }), tag: t("dashboard.growth.feed.growthTag"), icon: "growth", opportunityId: top.id },
    { title: t("dashboard.growth.feed.keyword.title"), description: t("dashboard.growth.feed.keyword.description", { niche: keyword.niche, score: Math.round(keyword.marketOpportunityScore) }), tag: t("dashboard.growth.feed.keywordTag"), icon: "keyword", opportunityId: keyword.id },
    { title: t("dashboard.growth.feed.differentiate.title"), description: t("dashboard.growth.feed.differentiate.description", { niche: differentiate.niche, count: differentiate.insights.distinctListingCount }), tag: t("dashboard.growth.feed.differentiateTag"), icon: "differentiate", opportunityId: differentiate.id },
  ];
}
