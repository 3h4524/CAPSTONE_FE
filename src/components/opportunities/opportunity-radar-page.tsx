"use client";

import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import type { TFunction } from "i18next";
import { ArrowRight, BarChart3, Bookmark, Check, ChevronLeft, ChevronRight, CircleHelp, Clock, Compass, GitCompareArrows, LayoutGrid, List, type LucideIcon, Pencil, Radar, RefreshCw, SlidersHorizontal, Sparkles, Target, TriangleAlert, Trophy, Users, X, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import {
  analyzeSellerOpportunity,
  getLatestSellerOpportunityAnalysis,
  getSellerResearchProfile,
  listSellerMarketInsights,
  listSellerOpportunities,
  type OpportunityAnalysis,
  refreshSellerOpportunities,
  saveSellerResearchProfile,
  type SellerMarketInsight,
  type SellerNicheMarketInsight,
  type SellerOpportunity,
  type SellerResearchProfileInput,
  updateSellerOpportunityState,
} from "@/api/market-opportunities";
import { translateTexts, type TranslationItem } from "@/api/translations";
import { LevelMeter, PriceHistogram, PriceInterestScatter, ShareDonut, StrongSellerBar, SupplySparkline } from "@/components/opportunities/market-charts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuthStore } from "@/stores/auth";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";

const profileKey = ["seller-research-profile"] as const;
const opportunityKey = ["seller-opportunities"] as const;
const marketInsightKey = (userId?: string) => ["seller-market-insights", userId] as const;

const profileQueryKey = (userId?: string) => [...profileKey, userId] as const;
const opportunityQueryKey = (userId: string | undefined, state: string) =>
  [...opportunityKey, userId, state] as const;
const analysisQueryKey = (id: string) => [...opportunityKey, "analysis", id] as const;

const splitValues = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const initialProfile: SellerResearchProfileInput = {
  shopGoal: "",
  targetAudiences: [],
  preferredCategories: [],
  excludedCategories: [],
  preferredKeywords: [],
  minimumPrice: null,
  maximumPrice: null,
};
const apparelProfilePreset: SellerResearchProfileInput = {
  shopGoal: "Find profitable handmade apparel and personalized clothing products.",
  targetAudiences: ["women", "men", "couples", "gift buyers"],
  preferredCategories: ["apparel", "clothing", "personalized gifts"],
  excludedCategories: ["jewelry", "cosmetics", "food", "electronics"],
  preferredKeywords: ["t-shirt", "hoodie", "sweatshirt", "embroidered", "personalized", "custom", "wedding", "pet"],
  minimumPrice: 20,
  maximumPrice: 80,
};
const stateLabel: Record<SellerOpportunity["state"], string> = {
  new: "New", saved: "Saved", ignored: "Ignored", acted: "Acted", dismissed: "Dismissed",
};
const stateStyle: Record<SellerOpportunity["state"], string> = {
  new: "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 ring-blue-100 dark:ring-blue-500/30",
  saved: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-100 dark:ring-amber-500/30",
  ignored: "bg-ink-100 text-ink-500 ring-ink-200",
  acted: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-100 dark:ring-emerald-500/30",
  dismissed: "bg-ink-100 text-ink-500 ring-ink-200",
};
const stateFilters = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "saved", label: "Saved" },
  { value: "ignored", label: "Ignored" },
  { value: "acted", label: "Acted" },
];
const opportunitiesPerPage = 5;

// Same thresholds everywhere a score is coloured: strong, worth a look, weak.
const scoreTone = (score: number) =>
  score >= 75
    ? { text: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", ring: "stroke-emerald-500" }
    : score >= 50
      ? { text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500", ring: "stroke-amber-500" }
      : { text: "text-ink-500", bar: "bg-ink-400", ring: "stroke-ink-400" };

const timeAgo = (iso: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

type CardActions = {
  busy: boolean;
  analysis?: OpportunityAnalysis;
  analyzing: boolean;
  onAnalyze: () => void;
  onState: (state: SellerOpportunity["state"]) => void;
  isCompared: boolean;
  onCompare: () => void;
};

export function OpportunityRadarPage() {
  const { t, i18n } = useTranslation("common");
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [activeState, setActiveState] = useState("all");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [profile, setProfile] = useState<SellerResearchProfileInput>(initialProfile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [analysis, setAnalysis] = useState<Record<string, OpportunityAnalysis>>({});
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [opportunityPage, setOpportunityPage] = useState(1);
  const [tab, setTab] = useState<RadarTab>("radar");
  const canLoadSellerData = isHydrated && Boolean(userId);
  const locale = i18n.resolvedLanguage?.toLowerCase().startsWith("vi") ? "vi" : "en";
  const sellerProfileQueryKey = profileQueryKey(userId);
  const profileQuery = useQuery({
    queryKey: sellerProfileQueryKey,
    queryFn: getSellerResearchProfile,
    enabled: canLoadSellerData,
  });
  const opportunitiesQuery = useQuery({
    queryKey: opportunityQueryKey(userId, activeState),
    queryFn: () => listSellerOpportunities(activeState === "all" ? undefined : activeState),
    enabled: canLoadSellerData,
  });
  // The unfiltered list feeds the tab counts and the hero; on the All tab it is the same query.
  const allQuery = useQuery({ queryKey: [...opportunityKey, userId, "all"], queryFn: () => listSellerOpportunities(), enabled: canLoadSellerData });
  const hasProfile = Boolean(profileQuery.data?.profileVersion);
  const marketInsightsQuery = useQuery({
    queryKey: marketInsightKey(userId),
    queryFn: () => listSellerMarketInsights(),
    enabled: canLoadSellerData && hasProfile,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setProfile({
      shopGoal: profileQuery.data.shopGoal ?? "",
      targetAudiences: profileQuery.data.targetAudiences,
      preferredCategories: profileQuery.data.preferredCategories,
      excludedCategories: profileQuery.data.excludedCategories,
      preferredKeywords: profileQuery.data.preferredKeywords,
      minimumPrice: profileQuery.data.minimumPrice,
      maximumPrice: profileQuery.data.maximumPrice,
    });
    // A saved profile is shown as a summary; an empty profile opens the setup form.
    setProfileOpen(!profileQuery.data.profileVersion);
    if (!profileQuery.data.profileVersion) setTab("profile");
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: saveSellerResearchProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(sellerProfileQueryKey, data);
      queryClient.invalidateQueries({ queryKey: marketInsightKey(userId) });
      setProfileOpen(false);
       toast.success(t("marketRadar.saveProfile"));
    },
     onError: () => toast.error(t("marketRadar.saveProfile")),
  });
  const refreshMutation = useMutation({
    mutationFn: refreshSellerOpportunities,
    onSuccess: (data) => {
      queryClient.setQueryData(opportunityQueryKey(userId, activeState), data);
      queryClient.invalidateQueries({ queryKey: opportunityKey });
      queryClient.invalidateQueries({ queryKey: marketInsightKey(userId) });
      if (data.length > 0) {
           toast.success(`${t("marketRadar.opportunities")}: ${data.length}`);
      } else {
         toast.info(t("marketRadar.noData", { state: t("marketRadar.all").toLowerCase() }));
      }
    },
     onError: () => toast.error(t("marketRadar.buildRadar")),
  });
  const stateMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: SellerOpportunity["state"] }) => updateSellerOpportunityState(id, state),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: opportunityKey }),
     onError: () => toast.error(t("marketRadar.updateError", { defaultValue: "Could not update this opportunity" })),
  });
  const analysisMutation = useMutation({
    mutationFn: analyzeSellerOpportunity,
    onSuccess: (result) => {
      setAnalysis((current) => ({ ...current, [result.sellerOpportunityId]: result }));
      queryClient.setQueryData(analysisQueryKey(result.sellerOpportunityId), result);
    },
     onError: () => toast.error(t("marketRadar.analyzeError", { defaultValue: "Could not analyze this opportunity" })),
  });
  const opportunities = useMemo(() => opportunitiesQuery.data ?? [], [opportunitiesQuery.data]);
  const allOpportunities = useMemo(() => allQuery.data ?? [], [allQuery.data]);
  const translationItems = useMemo<TranslationItem[]>(() => {
    if (locale === "en") return [];

    const items: TranslationItem[] = [];
    for (const item of allOpportunities) {
      items.push({ key: `${item.id}:title`, text: item.title });
      if (item.summary) items.push({ key: `${item.id}:summary`, text: item.summary });
      if (item.fitExplanation) items.push({ key: `${item.id}:fitExplanation`, text: item.fitExplanation });
      for (const evidence of item.insights.evidence) {
        if (evidence.title) items.push({ key: `${item.id}:evidence:${evidence.title}`, text: evidence.title });
      }
      if (items.length >= 128) break;
    }
    return items;
  }, [allOpportunities, locale]);
  const translationQuery = useQuery({
    queryKey: ["runtime-translations", locale, translationItems],
    queryFn: () => translateTexts({ items: translationItems, targetLocale: locale }),
    enabled: canLoadSellerData && locale !== "en" && translationItems.length > 0,
    staleTime: 30 * 60_000,
    retry: 0,
  });
  const translationLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    for (const item of translationQuery.data ?? []) lookup.set(item.key, item.text);
    return lookup;
  }, [translationQuery.data]);
  const translatedOpportunities = useMemo(() => {
    const translate = (key: string, value: string | null) => value ? translationLookup.get(key) ?? value : value;
    const translateItem = (item: SellerOpportunity): SellerOpportunity => ({
      ...item,
      title: translate(`${item.id}:title`, item.title) ?? item.title,
      summary: translate(`${item.id}:summary`, item.summary),
      fitExplanation: translate(`${item.id}:fitExplanation`, item.fitExplanation),
      insights: {
        ...item.insights,
        evidence: item.insights.evidence.map((evidence) => ({
          ...evidence,
          title: translate(`${item.id}:evidence:${evidence.title}`, evidence.title) ?? evidence.title,
        })),
      },
    });
    return {
      current: opportunities.map(translateItem),
      all: allOpportunities.map(translateItem),
    };
  }, [allOpportunities, opportunities, translationLookup]);
  const localizedOpportunities = translatedOpportunities.current;
  const localizedAllOpportunities = translatedOpportunities.all;
  const opportunityPageCount = Math.max(1, Math.ceil(localizedOpportunities.length / opportunitiesPerPage));
  const pagedOpportunities = useMemo(
    () => localizedOpportunities.slice((opportunityPage - 1) * opportunitiesPerPage, opportunityPage * opportunitiesPerPage),
    [localizedOpportunities, opportunityPage],
  );

  useEffect(() => {
    setOpportunityPage(1);
  }, [activeState]);

  useEffect(() => {
    setOpportunityPage((current) => Math.min(current, opportunityPageCount));
  }, [opportunityPageCount]);
  const savedAnalysisQueries = useQueries({
    queries: allOpportunities.map((item) => ({
      queryKey: analysisQueryKey(item.id),
      queryFn: () => getLatestSellerOpportunityAnalysis(item.id),
      enabled: canLoadSellerData,
      staleTime: 60_000,
    })),
  });
  const persistedAnalysis = useMemo(() => {
    const result: Record<string, OpportunityAnalysis> = {};
    allOpportunities.forEach((item, index) => {
      const saved = savedAnalysisQueries[index]?.data;
      if (saved) result[item.id] = saved;
    });
    return result;
  }, [allOpportunities, savedAnalysisQueries]);
  const averageScore = useMemo(
    () => allOpportunities.length ? Math.round(allOpportunities.reduce((sum, item) => sum + item.finalScore, 0) / allOpportunities.length) : 0,
    [allOpportunities],
  );
  const stateCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allOpportunities.length };
    for (const item of allOpportunities) counts[item.state] = (counts[item.state] ?? 0) + 1;
    return counts;
  }, [allOpportunities]);
  const lastEvaluatedAt = useMemo(
    () => allOpportunities.reduce<string | null>((latest, item) => (!latest || item.lastEvaluatedAt > latest ? item.lastEvaluatedAt : latest), null),
    [allOpportunities],
  );
  const topOpportunity = localizedAllOpportunities[0];
  const nicheInsight = marketInsightsQuery.data?.[0];
  const comparedOpportunities = useMemo(
    () => compareIds.map((id) => localizedAllOpportunities.find((item) => item.id === id)).filter((item): item is SellerOpportunity => Boolean(item)),
    [localizedAllOpportunities, compareIds],
  );
  const newCount = stateCounts.new ?? 0;
  const savedCount = stateCounts.saved ?? 0;
  const actedCount = stateCounts.acted ?? 0;
  const updateList = (key: keyof SellerResearchProfileInput, value: string) =>
    setProfile((current) => ({ ...current, [key]: splitValues(value) }));
  const actionsFor = (item: SellerOpportunity): CardActions => ({
    busy: stateMutation.isPending,
    analysis: analysis[item.id] ?? persistedAnalysis[item.id],
    analyzing: analysisMutation.isPending && analysisMutation.variables === item.id,
    onAnalyze: () => analysisMutation.mutate(item.id),
    onState: (state) => stateMutation.mutate({ id: item.id, state }),
    isCompared: compareIds.includes(item.id),
    onCompare: () => {
      setCompareIds((current) => {
        if (current.includes(item.id)) return current.filter((id) => id !== item.id);
        if (current.length >= 3) {
           toast.info(t("marketRadar.compareDescription"));
          return current;
        }
        return [...current, item.id];
      });
    },
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex w-full min-w-0 flex-col gap-5 p-4 sm:p-6">
        <section className="relative overflow-hidden rounded-2xl bg-[#17263f] px-5 py-5 text-white shadow-[0_16px_40px_rgba(23,38,63,0.2)] sm:px-6">
          <div className="absolute -top-24 -right-20 size-72 rounded-full bg-blue-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <span className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-blue-200 sm:flex"><Compass className="size-5" /></span>
              <div className="min-w-0">
                 <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("marketRadar.title")}</h1>
                 <p className="mt-0.5 text-sm text-ink-300">{t("marketRadar.subtitle")}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-card/[0.06]">
                 <HeroStat label={t("marketRadar.opportunities")} value={String(allOpportunities.length)} />
                 <HeroStat label={t("marketRadar.averageFit")} value={allOpportunities.length ? `${averageScore}/100` : "—"} />
                 <HeroStat label={t("marketRadar.profile")} value={hasProfile ? t("marketRadar.ready") : t("marketRadar.setup")} />
              </div>
              <div className="flex flex-col items-stretch gap-1 sm:items-end">
                <Button type="button" variant="primaryBlue" className="shrink-0" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
                  <RefreshCw className={refreshMutation.isPending ? "size-4 animate-spin" : "size-4"} />
                   {refreshMutation.isPending ? t("marketRadar.refreshing") : t("marketRadar.refresh")}
                 </Button>
                 {lastEvaluatedAt && <p className="flex items-center justify-center gap-1 text-[11px] text-ink-400"><Clock className="size-3" />{t("marketRadar.updated", { value: timeAgo(lastEvaluatedAt) })}</p>}
              </div>
            </div>
          </div>
        </section>


        <RadarTabs
          active={tab}
          onChange={setTab}
          tabs={[
            { value: "radar", label: t("marketRadar.tabRadar", { defaultValue: "Opportunity radar" }), badge: String(allOpportunities.length), icon: Radar },
            { value: "niche", label: t("marketRadar.tabNiche", { defaultValue: "Niche overview" }), badge: nicheInsight ? formatVerdict(nicheInsight.verdict) : undefined, icon: BarChart3 },
            { value: "competitors", label: t("marketRadar.tabCompetitors", { defaultValue: "Competitors" }), badge: nicheInsight && nicheInsight.signals.sellerCount > 0 ? t("marketRadar.strongBadge", { defaultValue: "{{count}} strong", count: nicheInsight.signals.strongSellerCount }) : undefined, icon: Users },
            { value: "profile", label: t("marketRadar.tabProfile", { defaultValue: "Seller profile" }), badge: hasProfile ? t("marketRadar.ready") : t("marketRadar.setup"), icon: SlidersHorizontal },
          ]}
        />

        {tab === "profile" && (        <Card className="gap-0 border-ink-200 bg-card py-0 shadow-sm">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"><SlidersHorizontal className="size-4" /></span>
              <div>
                 <h2 className="font-semibold text-ink-900">{t("marketRadar.sellerProfile")}</h2>
                 <p className="text-sm text-ink-500">{t("marketRadar.sellerProfileDescription")}</p>
              </div>
            </div>
            {hasProfile && (
              <Button type="button" variant="outline" size="sm" className="shrink-0 self-start sm:self-center" onClick={() => setProfileOpen((open) => !open)}>
                 {profileOpen ? <><X className="size-3.5" />{t("marketRadar.close")}</> : <><Pencil className="size-3.5" />{t("marketRadar.editProfile")}</>}
              </Button>
            )}
          </div>

          {!profileOpen && hasProfile && <CompactProfileSummary profile={profile} />}

          {profileOpen && (
            canLoadSellerData && profileQuery.isPending ? (
              <div className="flex min-h-40 items-center justify-center text-sm text-ink-500" role="status">
                 {t("marketRadar.loadingProfile", { defaultValue: "Loading your saved seller profile..." })}
              </div>
            ) : (
              <form className="grid gap-5 border-t border-ink-100 p-5 lg:grid-cols-2" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(profile); }}>
                <div className="flex flex-wrap items-center justify-between gap-2 lg:col-span-2">
                  <p className="text-xs text-ink-500">{t("marketRadar.profilePresetHint", { defaultValue: "Match the profile to the apparel dataset to improve relevance and seller fit." })}</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setProfile(apparelProfilePreset)}>
                    {t("marketRadar.useApparelPreset", { defaultValue: "Use apparel preset" })}
                  </Button>
                </div>
                <div className="space-y-2 lg:col-span-2">
                   <Label htmlFor="shop-goal">{t("marketRadar.shopGoal")}</Label>
                   <Textarea id="shop-goal" value={profile.shopGoal ?? ""} onChange={(event) => setProfile((current) => ({ ...current, shopGoal: event.target.value }))} placeholder={t("marketRadar.shopGoalPlaceholder", { defaultValue: "e.g. Find profitable personalized home decor niches for Q4" })} />
                </div>
                 <ProfileField id="audiences" label={t("marketRadar.targetAudiences")} value={profile.targetAudiences.join(", ")} onChange={(value) => updateList("targetAudiences", value)} placeholder="new homeowners, gift buyers" />
                 <ProfileField id="categories" label={t("marketRadar.preferredCategories")} value={profile.preferredCategories.join(", ")} onChange={(value) => updateList("preferredCategories", value)} placeholder="home decor, gifts" />
                 <ProfileField id="excluded" label={t("marketRadar.excludedCategories")} value={profile.excludedCategories.join(", ")} onChange={(value) => updateList("excludedCategories", value)} placeholder="clothing, jewelry" />
                 <ProfileField id="keywords" label={t("marketRadar.preferredKeywords")} value={profile.preferredKeywords.join(", ")} onChange={(value) => updateList("preferredKeywords", value)} placeholder="personalized, wood, minimal" />
                <div className="space-y-2">
                   <Label>{t("marketRadar.targetPrice")}</Label>
                  <div className="grid grid-cols-2 gap-3">
                     <Input type="number" min="0" placeholder={t("marketRadar.min")} value={profile.minimumPrice ?? ""} onChange={(event) => setProfile((current) => ({ ...current, minimumPrice: event.target.value ? Number(event.target.value) : null }))} />
                     <Input type="number" min="0" placeholder={t("marketRadar.max")} value={profile.maximumPrice ?? ""} onChange={(event) => setProfile((current) => ({ ...current, maximumPrice: event.target.value ? Number(event.target.value) : null }))} />
                  </div>
                </div>
                 <div className="flex items-end justify-end lg:col-span-2"><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? t("marketRadar.savingProfile") : t("marketRadar.saveProfile")}</Button></div>
              </form>
            )
          )}
        </Card>
        )}

        {tab === "niche" && canLoadSellerData && !profileQuery.isPending && (
          <NicheInsightSection
            hasProfile={hasProfile}
            loading={hasProfile && marketInsightsQuery.isPending}
            error={hasProfile && marketInsightsQuery.isError}
            insights={marketInsightsQuery.data ?? []}
          />
        )}

        {tab === "competitors" && canLoadSellerData && !profileQuery.isPending && (
          <CompetitorSection
            hasProfile={hasProfile}
            loading={hasProfile && marketInsightsQuery.isPending}
            error={hasProfile && marketInsightsQuery.isError}
            insight={nicheInsight}
          />
        )}
        {tab === "radar" && (
          <>
        {topOpportunity && (
          <RadarSnapshot
            topOpportunity={topOpportunity}
            newCount={newCount}
            savedCount={savedCount}
            actedCount={actedCount}
            onAnalyze={() => analysisMutation.mutate(topOpportunity.id)}
            onState={(state) => stateMutation.mutate({ id: topOpportunity.id, state })}
            analyzing={analysisMutation.isPending && analysisMutation.variables === topOpportunity.id}
          />
        )}

        {comparedOpportunities.length > 0 && (
          <ComparePanel items={comparedOpportunities} onRemove={(id) => setCompareIds((current) => current.filter((itemId) => itemId !== id))} />
        )}

        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
             <div><h2 className="text-lg font-semibold text-ink-900">{t("marketRadar.recommended")}</h2><p className="mt-1 text-sm text-ink-500">{t("marketRadar.recommendedDescription")}</p></div>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex min-w-0 flex-1 overflow-x-auto rounded-xl border border-ink-200 bg-card p-1 lg:flex-none">
                {stateFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={activeState === filter.value}
                    onClick={() => setActiveState(filter.value)}
                    className={"flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors lg:flex-none " + (activeState === filter.value ? "bg-[#17263f] text-white shadow-sm" : "text-ink-500 hover:bg-ink-50 hover:text-ink-800")}
                  >
                    {t(`marketRadar.${filter.value}`, { defaultValue: filter.label })}
                    <span className={"rounded-full px-1.5 text-[11px] tabular-nums " + (activeState === filter.value ? "bg-white/15" : "bg-ink-100 text-ink-500")}>{stateCounts[filter.value] ?? 0}</span>
                  </button>
                ))}
              </div>
              <div className="flex shrink-0 rounded-xl border border-ink-200 bg-card p-1">
                 {([["cards", LayoutGrid, t("marketRadar.cardView")], ["list", List, t("marketRadar.listView")]] as const).map(([value, Icon, label]) => (
                  <button key={value} type="button" aria-label={label} title={label} aria-pressed={view === value} onClick={() => setView(value)} className={"rounded-lg p-1.5 transition-colors " + (view === value ? "bg-ink-100 text-ink-900" : "text-ink-400 hover:text-ink-700")}>
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          {opportunitiesQuery.isPending ? (
             <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((index) => <OpportunitySkeleton key={index} />)}</div>
          ) : opportunitiesQuery.isError ? (
             <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-10 text-center text-sm text-red-700 dark:text-red-300">{t("errors.loadOpportunities")}</div>
          ) : opportunities.length === 0 ? (
            <EmptyRadar
              hasProfile={hasProfile}
              filtered={activeState !== "all"}
               stateName={t(`marketRadar.${activeState}`, { defaultValue: activeState })}
              building={refreshMutation.isPending}
              onBuild={() => refreshMutation.mutate()}
              onSetup={() => setProfileOpen(true)}
            />
          ) : view === "list" ? (
            <Card className="gap-0 overflow-hidden border-ink-200 bg-card py-0 shadow-sm">
               {pagedOpportunities.map((item) => <OpportunityRow key={item.id} item={item} {...actionsFor(item)} />)}
            </Card>
          ) : (
             <div className="grid items-start gap-4 lg:grid-cols-2">
               {pagedOpportunities.map((item) => <OpportunityCard key={item.id} item={item} featured={activeState === "all" && item.rank === 1} {...actionsFor(item)} />)}
            </div>
          )}
          {opportunities.length > opportunitiesPerPage && (
            <OpportunityPagination
              page={opportunityPage}
              pageCount={opportunityPageCount}
              total={opportunities.length}
              pageSize={opportunitiesPerPage}
              onPageChange={setOpportunityPage}
            />
          )}
        </section>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-2 text-center sm:min-w-28 sm:px-4">
      <p className="text-lg font-semibold text-white tabular-nums">{value}</p>
      <p className="text-[9px] font-medium tracking-[0.08em] whitespace-nowrap text-ink-400 uppercase sm:text-[10px] sm:tracking-[0.12em]">{label}</p>
    </div>
  );
}

function OpportunityPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation("common");
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-ink-200 bg-card px-4 py-3 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between">
      <span>{first}–{last} {t("marketRadar.of", { defaultValue: "of" })} {total}</span>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t("marketRadar.previousPage", { defaultValue: "Previous page" })}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">{t("marketRadar.previous", { defaultValue: "Previous" })}</span>
        </Button>
        <span className="min-w-20 text-center text-xs font-medium text-ink-600">
          {t("marketRadar.page", { defaultValue: "Page" })} {page} / {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={t("marketRadar.nextPage", { defaultValue: "Next page" })}
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="hidden sm:inline">{t("marketRadar.next", { defaultValue: "Next" })}</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// Kept temporarily as a compatibility reference for the previous keyword-level UI.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyMarketSignalSection({
  hasProfile,
  loading,
  error,
  insights,
}: {
  hasProfile: boolean;
  loading: boolean;
  error: boolean;
  insights: SellerMarketInsight[];
}) {
  const { t } = useTranslation("common");

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-blue-700 dark:text-blue-300 uppercase"><BarChart3 className="size-3.5" />{t("marketRadar.marketSignals", { defaultValue: "Market signals for your profile" })}</p>
          <p className="mt-1 text-sm text-ink-500">{t("marketRadar.marketSignalsDescription", { defaultValue: "Keyword-level insights from the shared public Etsy dataset, matched to your seller profile." })}</p>
        </div>
      </div>
      {!hasProfile ? (
        <div className="rounded-xl border border-dashed border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 p-6 text-sm text-blue-800 dark:text-blue-300">
          {t("marketRadar.marketSignalsSetup", { defaultValue: "Save your seller profile above to match public Etsy market signals to your niche." })}
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-ink-200 bg-card p-8 text-center text-sm text-ink-500" role="status">
          {t("marketRadar.marketSignalsLoading", { defaultValue: "Loading public Etsy market signals..." })}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-6 text-sm text-red-700 dark:text-red-300">
          {t("marketRadar.marketSignalsError", { defaultValue: "Market signals could not be loaded. Try refreshing the radar." })}
        </div>
      ) : insights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-card p-8 text-center text-sm text-ink-500">
          <p>{t("marketRadar.noMatchingSignals", { defaultValue: "No collected market signals match this seller profile yet." })}</p>
          <p className="mt-2 text-xs text-ink-400">{t("marketRadar.noMatchingSignalsHint", { defaultValue: "These signals come from public Etsy snapshots collected by the admin Market Insights job." })}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {insights.map((insight) => {
            const listingGrowth = insight.listingGrowthPercent == null
              ? t("marketRadar.trendUnavailable")
              : `${insight.listingGrowthPercent > 0 ? "+" : ""}${Math.round(insight.listingGrowthPercent)}%`;
            const engagementChange = insight.engagementChangePercent == null
              ? t("marketRadar.trendUnavailable")
              : `${insight.engagementChangePercent > 0 ? "+" : ""}${Math.round(insight.engagementChangePercent)}%`;
            const price = insight.medianPrice == null
              ? t("marketRadar.priceUnavailable")
              : insight.medianPrice.toFixed(2);

            return (
              <Card key={insight.query} className="gap-0 overflow-hidden border-ink-200 bg-card py-0 shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-ink-400 uppercase">{t("marketRadar.keywordSignal", { defaultValue: "Keyword signal" })}</p>
                    <h3 className="mt-1 truncate text-base font-semibold text-ink-900 capitalize" title={insight.query}>{insight.query}</h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 dark:bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-300">{formatInsightType(insight.insightType)}</span>
                </div>
                <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-ink-100 px-5 py-3 text-xs font-semibold text-ink-600 marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">{t("marketRadar.viewSignals", { defaultValue: "View market signals" })}</span>
                  <span className="hidden group-open:inline">{t("marketRadar.collapse")}</span>
                  <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-b border-blue-100 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/10 px-5 py-4">
                  <p className="text-[10px] font-bold tracking-[0.12em] text-blue-700 dark:text-blue-300 uppercase">{t("marketRadar.actionableInsight", { defaultValue: "Actionable insight" })}</p>
                  <p className="mt-1 text-sm leading-6 font-semibold text-ink-900">{insight.recommendation}</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.12em] text-ink-500 uppercase">{t("marketRadar.actionPlan", { defaultValue: "Action plan" })}</p>
                      <ol className="mt-2 space-y-1.5 text-xs leading-5 text-ink-700">
                        {insight.actionPlan.slice(0, 3).map((step, index) => <li key={step}><span className="mr-1.5 font-semibold text-blue-700 dark:text-blue-300">{index + 1}.</span>{step}</li>)}
                      </ol>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.12em] text-ink-500 uppercase">{t("marketRadar.risks", { defaultValue: "Risk" })}</p>
                      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-ink-600">
                        {insight.risks.slice(0, 2).map((risk) => <li key={risk}>• {risk}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
                  <InsightMetric label={t("marketRadar.listingTrend", { defaultValue: "Listing trend" })} value={insight.listingTrend} detail={`${listingGrowth} listings`} tone={insight.listingTrend === "growing" ? "up" : insight.listingTrend === "reducing" ? "down" : undefined} />
                  <InsightMetric label={t("marketRadar.engagement")} value={insight.engagementTrend} detail={`${engagementChange} ${t("marketRadar.engagement").toLowerCase()}`} tone={insight.engagementTrend} />
                  <InsightMetric label={t("marketRadar.demandProxy", { defaultValue: "Demand proxy" })} value={insight.demandProxy} detail={`${insight.averageFavorites?.toLocaleString() ?? "—"} favorites`} />
                  <InsightMetric label={t("marketRadar.competition")} value={insight.competitionLevel} detail={`${insight.distinctSellerCount} sellers`} />
                  <InsightMetric label={t("marketRadar.typicalPrice")} value={price} detail={t("marketRadar.observedPrice")} />
                  <InsightMetric label={t("marketRadar.evidenceQuality")} value={insight.evidenceQuality} detail={`${insight.observationPeriodCount} periods`} />
                  <InsightMetric label={t("marketRadar.seasonality", { defaultValue: "Seasonality" })} value={insight.seasonality} detail={insight.newListingCount.toLocaleString() + " new listings"} />
                </div>
                {insight.topTags.length > 0 && (
                  <div className="border-t border-ink-100 px-5 py-3">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-ink-400 uppercase">{t("marketRadar.topTags", { defaultValue: "Top tags" })}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {insight.topTags.slice(0, 6).map((tag) => (
                        <span key={tag.tag} className="rounded-full bg-ink-50 px-2 py-1 text-[11px] text-ink-600 ring-1 ring-ink-200">{tag.tag} · {tag.listingCount}</span>
                      ))}
                    </div>
                  </div>
                )}
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function NicheInsightSection({
  hasProfile,
  loading,
  error,
  insights,
}: {
  hasProfile: boolean;
  loading: boolean;
  error: boolean;
  insights: SellerNicheMarketInsight[];
}) {
  const { t } = useTranslation("common");

  return (
    <section className="space-y-3">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-blue-700 dark:text-blue-300 uppercase"><BarChart3 className="size-3.5" />{t("marketRadar.nicheConclusion", { defaultValue: "Niche market conclusion" })}</p>
        <p className="mt-1 text-sm text-ink-500">{t("marketRadar.nicheConclusionDescription", { defaultValue: "A conclusion from the shared public Etsy market dataset, matched to your seller profile." })}</p>
      </div>
      {!hasProfile ? (
        <div className="rounded-xl border border-dashed border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 p-6 text-sm text-blue-800 dark:text-blue-300">{t("marketRadar.marketSignalsSetup", { defaultValue: "Save your seller profile above to match public Etsy market signals to your niche." })}</div>
      ) : loading ? (
        <div className="rounded-xl border border-ink-200 bg-card p-8 text-center text-sm text-ink-500" role="status">{t("marketRadar.marketSignalsLoading", { defaultValue: "Calculating your niche conclusion from public Etsy data..." })}</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-6 text-sm text-red-700 dark:text-red-300">{t("marketRadar.marketSignalsError", { defaultValue: "The niche conclusion could not be loaded. Try refreshing the radar." })}</div>
      ) : insights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 bg-card p-8 text-center text-sm text-ink-500">
          <p>{t("marketRadar.noMatchingSignals", { defaultValue: "No market group matches this seller profile yet." })}</p>
          <p className="mt-2 text-xs text-ink-400">{t("marketRadar.noMatchingSignalsHint", { defaultValue: "Run the admin Market Insights collection with keywords close to this niche." })}</p>
        </div>
      ) : (
        <NicheConclusionCard insight={insights[0]} />
      )}
    </section>
  );
}

function NicheConclusionCard({ insight: source }: { insight: SellerNicheMarketInsight }) {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.resolvedLanguage?.toLowerCase().startsWith("vi") ? "vi" : "en";
  const insight = useLocalizedNiche(source, locale);
  const [showWhy, setShowWhy] = useState(false);
  const { marketSupply, signals } = insight;
  const unavailable = t("marketRadar.notEnoughData", { defaultValue: "Not enough data" });
  const verdictTone = insight.verdict === "worth_following"
    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-200 dark:ring-emerald-500/30"
    : insight.verdict === "avoid_for_now"
      ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-200 dark:ring-rose-500/30"
      : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-200 dark:ring-amber-500/30";
  const observedDays = Math.max(insight.observationPeriodCount, marketSupply.observationDayCount);
  const strongShare = signals.sellerCount > 0 ? Math.round((signals.strongSellerCount / signals.sellerCount) * 100) : null;

  return (
    <Card className="gap-0 overflow-hidden border-ink-200 bg-card py-0 shadow-sm">
      <div className="flex flex-col gap-3 px-5 pt-5 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-ink-900 capitalize">{insight.niche}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ring-1 ${verdictTone}`}>{formatVerdict(insight.verdict)}</span>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {t("marketRadar.confidenceLine", {
              defaultValue: "Confidence {{quality}} · {{listings}} top listings · {{days}} day(s) of data",
              quality: insight.evidenceQuality,
              listings: signals.sampleListingCount,
              days: observedDays,
            })}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 self-start" onClick={() => setShowWhy((open) => !open)}>
          <BarChart3 className="size-3.5" />
          {showWhy ? t("marketRadar.hideWhy", { defaultValue: "Hide breakdown" }) : t("marketRadar.showWhy", { defaultValue: "Why this verdict" })}
          <ChevronRight className={`size-3.5 transition-transform ${showWhy ? "rotate-90" : ""}`} />
        </Button>
      </div>

      <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t("marketRadar.tileMarket", { defaultValue: "Market size" })}
          value={marketSupply.activeListingCount == null ? "—" : compactNumber(marketSupply.activeListingCount)}
          badge={marketSupply.changePercent == null ? undefined : formatSigned(marketSupply.changePercent)}
          badgeTone={marketSupply.trend === "growing" ? "down" : marketSupply.trend === "reducing" ? "up" : undefined}
          caption={t("marketRadar.tileMarketCaption", { defaultValue: "Active listings on Etsy" })}
          progress={marketSupply.sizePercentile}
          chart={marketSupply.history && marketSupply.history.length >= 2 ? <SupplySparkline history={marketSupply.history} /> : undefined}
          footerLeft={marketSizeShort(marketSupply.sizePercentile, t)}
          footerRight={marketSupply.sizePercentile == null ? unavailable : t("marketRadar.sizeRankShort", { defaultValue: "{{value}}/100 vs niches", value: Math.round(marketSupply.sizePercentile) })}
        />
        <MetricTile
          label={t("marketRadar.tileStrongSellers", { defaultValue: "Strong competitors" })}
          value={signals.sellerCount > 0 ? `${signals.strongSellerCount} / ${signals.sellerCount}` : "—"}
          badge={signals.topSellerSharePercent == null ? undefined : t("marketRadar.topFiveBadge", { defaultValue: "Top 5: {{value}}%", value: signals.topSellerSharePercent })}
          caption={t("marketRadar.tileStrongSellersCaption", { defaultValue: "Shops at the top gaining 3+ favorites a month" })}
          progress={strongShare}
          chart={signals.sellerCount > 0 ? <StrongSellerBar strong={signals.strongSellerCount} total={signals.sellerCount} /> : undefined}
          footerLeft={strongShare == null ? unavailable : strongShare <= 10 ? t("marketRadar.fewStrong", { defaultValue: "Few strong shops" }) : t("marketRadar.activeCompetition", { defaultValue: "Active competition" })}
          footerRight={strongShare == null ? "" : strongShare <= 10 ? t("marketRadar.roomForEntrants", { defaultValue: "Room for entrants" }) : `${strongShare}%`}
          footerTone={strongShare != null && strongShare <= 10 ? "up" : undefined}
        />
        <MetricTile
          label={t("marketRadar.tileRising", { defaultValue: "New listings rising" })}
          value={`+${signals.risingNewListingCount}`}
          badge={signals.risingNewListingCount > 0 ? t("marketRadar.breakout", { defaultValue: "Open to newcomers" }) : undefined}
          badgeTone="up"
          caption={t("marketRadar.tileRisingCaption", { defaultValue: "Under 90 days old, 3+ favorites a month" })}
          progress={signals.newListingSharePercent}
          footerLeft={t("marketRadar.listingsUnder30", { defaultValue: "Listings under 30 days" })}
          footerRight={signals.newListingSharePercent == null ? unavailable : `${signals.newListingSharePercent}%`}
        />
        <MetricTile
          label={t("marketRadar.tileListPrice", { defaultValue: "Typical list price" })}
          value={signals.priceP25 == null || signals.priceP75 == null ? "—" : `${formatMoney(signals.priceP25)}–${formatMoney(signals.priceP75)}`}
          badge={signals.medianPrice == null ? undefined : t("marketRadar.medianBadge", { defaultValue: "Median {{value}}", value: formatMoney(signals.medianPrice) })}
          caption={signals.priceCurrency ? t("marketRadar.tileListPriceCaptionCurrency", { defaultValue: "Middle half of top listing list prices, {{currency}}, before discounts", currency: signals.priceCurrency }) : t("marketRadar.tileListPriceCaption", { defaultValue: "Middle half of top listing list prices, before discounts" })}
          progress={signals.personalizedSharePercent}
          chart={signals.points.length > 0 ? <PriceHistogram points={signals.points} p25={signals.priceP25} p75={signals.priceP75} /> : undefined}
          footerLeft={t("marketRadar.personalized", { defaultValue: "Personalized" })}
          footerRight={signals.personalizedSharePercent == null ? unavailable : `${signals.personalizedSharePercent}%`}
        />
      </div>

      {signals.points.length > 0 && (
        <div className="mx-5 mb-5 rounded-xl border border-ink-100 p-4">
          <p className="text-sm font-semibold text-ink-900">{t("marketRadar.scatterTitle", { defaultValue: "Where buyers show interest" })}</p>
          <p className="text-xs text-ink-500">{t("marketRadar.scatterSubtitle", { defaultValue: "Each dot is a top listing. Further right costs more; higher up gains more favorites each month. Look for the price range where orange dots (new listings) already sit high." })}</p>
          <PriceInterestScatter points={signals.points} p25={signals.priceP25} p75={signals.priceP75} currency={signals.priceCurrency} />
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-semibold text-ink-500">{t("marketRadar.showAsTable", { defaultValue: "Show as table" })}</summary>
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-ink-100">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-ink-50 text-[10px] tracking-[0.08em] text-ink-400 uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">{t("marketRadar.listing", { defaultValue: "Listing" })}</th>
                    <th className="px-3 py-2 font-semibold">{t("marketRadar.listPrice", { defaultValue: "List price" })}</th>
                    <th className="px-3 py-2 font-semibold">{t("marketRadar.favoritesPerMonth", { defaultValue: "Favorites / month" })}</th>
                    <th className="px-3 py-2 font-semibold">{t("marketRadar.age", { defaultValue: "Age" })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {[...signals.points].sort((a, b) => b.favoritesPer30Days - a.favoritesPer30Days).map((point) => (
                    <tr key={`${point.title}-${point.price}-${point.ageDays}`}>
                      <td className="max-w-64 truncate px-3 py-1.5" title={point.title}>
                        {point.url
                          ? <a className="text-blue-700 dark:text-blue-300 hover:underline" href={point.url} target="_blank" rel="noreferrer">{point.title}</a>
                          : <span className="text-ink-700">{point.title}</span>}
                      </td>
                      <td className="px-3 py-1.5 text-ink-600 tabular-nums">{formatMoney(point.price)}</td>
                      <td className="px-3 py-1.5 font-semibold text-ink-800 tabular-nums">{point.favoritesPer30Days}</td>
                      <td className="px-3 py-1.5 text-ink-600 tabular-nums">{t("marketRadar.daysShort", { defaultValue: "{{value}} d", value: point.ageDays })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}

      <div className="mx-5 mb-5 flex items-start gap-3 rounded-xl bg-blue-50 dark:bg-blue-500/10 px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white"><Zap className="size-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink-900">{t("marketRadar.nextStepTitle", { defaultValue: "Next step for your shop" })}</p>
          <p className="mt-0.5 text-sm leading-6 text-ink-600">{insight.actionPlan[0] ?? insight.recommendation}</p>
        </div>
      </div>

      {showWhy && (
        <div className="space-y-5 border-t border-ink-100 px-5 py-5">
          <p className="text-sm leading-6 text-ink-600">{insight.conclusion}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReasonPanel tone="good" title={t("marketRadar.whyTitle", { defaultValue: "What the data shows" })} items={insight.highlights} empty={unavailable} />
            <ReasonPanel tone="warn" title={t("marketRadar.watchOutTitle", { defaultValue: "Watch out" })} items={insight.risks} empty={unavailable} />
          </div>
          {insight.keywords.length > 0 && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] text-ink-500 uppercase">{t("marketRadar.compareKeywords", { defaultValue: "Compare keywords" })}</p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-ink-100">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="bg-ink-50 text-[10px] tracking-[0.08em] text-ink-400 uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">{t("marketRadar.keyword", { defaultValue: "Keyword" })}</th>
                      <th className="px-3 py-2 font-semibold">{t("marketRadar.tileMarket", { defaultValue: "Market size" })}</th>
                      <th className="px-3 py-2 font-semibold">{t("marketRadar.tileStrongSellers", { defaultValue: "Strong competitors" })}</th>
                      <th className="px-3 py-2 font-semibold">{t("marketRadar.tileRising", { defaultValue: "New listings rising" })}</th>
                      <th className="px-3 py-2 font-semibold">{t("marketRadar.keywordScore", { defaultValue: "Score" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {insight.keywords.map((keyword) => (
                      <tr key={keyword.keyword} className="hover:bg-ink-50/80">
                        <td className="max-w-48 truncate px-3 py-2.5 font-medium text-ink-800" title={keyword.keyword}>{keyword.keyword}</td>
                        <td className="px-3 py-2.5"><SizeBar percentile={keyword.sizePercentile} count={keyword.activeListingCount} level={keyword.competitionLevel} /></td>
                        <td className="px-3 py-2.5 text-ink-700 tabular-nums">{keyword.signals.sellerCount > 0 ? `${keyword.signals.strongSellerCount} / ${keyword.signals.sellerCount}` : "—"}</td>
                        <td className={`px-3 py-2.5 font-semibold tabular-nums ${keyword.signals.risingNewListingCount > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-ink-400"}`}>{keyword.signals.risingNewListingCount}</td>
                        <td className="px-3 py-2.5"><ScoreMeter value={keyword.keywordScore} tone={keyword.keywordScore >= 70 ? "green" : keyword.keywordScore >= 40 ? "amber" : "slate"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** Translates the niche's generated sentences and rising listing titles when the UI is not English. */
function useLocalizedNiche(insight: SellerNicheMarketInsight, locale: string): SellerNicheMarketInsight {
  const texts = useMemo(
    () => [
      insight.conclusion,
      insight.recommendation,
      ...insight.actionPlan,
      ...insight.risks,
      ...insight.highlights,
      ...insight.signals.risingListings.map((listing) => listing.title),
    ],
    [insight],
  );
  const items = useMemo<TranslationItem[]>(
    () => (locale === "en" ? [] : texts.map((text, index) => ({ key: `niche:${index}`, text })).filter((item) => item.text)),
    [locale, texts],
  );
  const query = useQuery({
    queryKey: ["runtime-translations", locale, items],
    queryFn: () => translateTexts({ items, targetLocale: locale }),
    enabled: locale !== "en" && items.length > 0,
    staleTime: 30 * 60_000,
    retry: 0,
  });

  return useMemo(() => {
    if (!query.data) return insight;
    const lookup = new Map(query.data.map((item) => [item.key, item.text]));
    let index = 0;
    const next = (text: string) => lookup.get(`niche:${index++}`) ?? text;
    return {
      ...insight,
      conclusion: next(insight.conclusion),
      recommendation: next(insight.recommendation),
      actionPlan: insight.actionPlan.map(next),
      risks: insight.risks.map(next),
      highlights: insight.highlights.map(next),
      signals: {
        ...insight.signals,
        risingListings: insight.signals.risingListings.map((listing) => ({ ...listing, title: next(listing.title) })),
      },
    };
  }, [insight, query.data]);
}

function MetricTile({
  label,
  value,
  badge,
  badgeTone,
  caption,
  progress,
  footerLeft,
  footerRight,
  footerTone,
  chart,
}: {
  label: string;
  value: string;
  badge?: string;
  badgeTone?: "up" | "down";
  caption: string;
  progress: number | null;
  chart?: ReactNode;
  footerLeft: string;
  footerRight: string;
  footerTone?: "up";
}) {
  const badgeClass = badgeTone === "up" ? "text-emerald-700 dark:text-emerald-300" : badgeTone === "down" ? "text-rose-700 dark:text-rose-300" : "text-ink-500";
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-ink-50 p-4">
      <p className="text-xs font-semibold text-ink-500">{label}</p>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-2xl font-bold tracking-tight text-ink-900 tabular-nums">{value}</p>
          {badge && <span className={`shrink-0 text-[11px] font-bold ${badgeClass}`}>{badge}</span>}
        </div>
        <p className="mt-0.5 text-xs text-ink-500">{caption}</p>
      </div>
      {chart ?? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(Math.max(progress ?? 0, 0), 100)}%` }} />
        </div>
      )}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-ink-500">{footerLeft}</span>
        <span className={`shrink-0 font-bold ${footerTone === "up" ? "text-emerald-700 dark:text-emerald-300" : "text-blue-700 dark:text-blue-300"}`}>{footerRight}</span>
      </div>
    </div>
  );
}

function ReasonPanel({ title, items, empty, tone }: { title: string; items: string[]; empty: string; tone: "good" | "warn" }) {
  const Icon = tone === "good" ? Check : TriangleAlert;
  const color = tone === "good" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300";
  return (
    <div className="rounded-xl bg-ink-50 p-4">
      <p className={`flex items-center gap-1.5 text-sm font-bold ${color}`}><Icon className="size-4" />{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-ink-400">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-5 text-ink-700">
              <Icon className={`mt-0.5 size-3.5 shrink-0 ${color}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SizeBar({ percentile, count, level }: { percentile: number | null; count: number | null; level: string }) {
  if (count == null) return <span className="text-ink-400">—</span>;
  const color = level === "low" ? "bg-emerald-500" : level === "medium" ? "bg-amber-500" : level === "high" ? "bg-rose-500" : "bg-ink-300";
  return (
    <div className="flex min-w-32 items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-ink-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.max(8, percentile ?? 0)}%` }} />
      </div>
      <span className="text-xs text-ink-500 tabular-nums">{compactNumber(count)}</span>
    </div>
  );
}

function marketSizeShort(percentile: number | null, t: TFunction) {
  if (percentile == null) return t("marketRadar.sizeUnranked", { defaultValue: "Not ranked yet" });
  if (percentile > 200 / 3) return t("marketRadar.sizeLarge", { defaultValue: "Large market" });
  if (percentile > 100 / 3) return t("marketRadar.sizeMedium", { defaultValue: "Mid-size market" });
  return t("marketRadar.sizeSmall", { defaultValue: "Small market" });
}

function compactNumber(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatSigned(value: number) {
  return `${value > 0 ? "+" : ""}${Math.round(value)}%`;
}

type RadarTab = "radar" | "competitors" | "niche" | "profile";

function RadarTabs({
  active,
  onChange,
  tabs,
}: {
  active: RadarTab;
  onChange: (tab: RadarTab) => void;
  tabs: Array<{ value: RadarTab; label: string; badge?: string; icon: LucideIcon }>;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 bg-ink-50/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 dark:mx-0 dark:bg-card/90 dark:px-0 dark:sm:mx-0 dark:sm:px-0 dark:max-md:bg-background/90 dark:lg:bg-panel/90">
      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl bg-ink-100 p-1">
        {tabs.map(({ value, label, badge, icon: Icon }) => {
          const selected = active === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(value)}
              className={"flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-all sm:px-4 " + (selected ? "bg-card font-semibold text-ink-900 shadow-sm" : "text-ink-500 hover:bg-card/60 hover:text-ink-800")}
            >
              <Icon className={"size-4 " + (selected ? "text-blue-600 dark:text-blue-400" : "")} />
              {label}
              {badge && <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + (selected ? "bg-blue-600 text-white" : "bg-card text-ink-600")}>{badge}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompetitorSection({
  hasProfile,
  loading,
  error,
  insight: source,
}: {
  hasProfile: boolean;
  loading: boolean;
  error: boolean;
  insight: SellerNicheMarketInsight | undefined;
}) {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.resolvedLanguage?.toLowerCase().startsWith("vi") ? "vi" : "en";

  if (!hasProfile) {
    return <div className="rounded-xl border border-dashed border-blue-200 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 p-6 text-sm text-blue-800 dark:text-blue-300">{t("marketRadar.marketSignalsSetup", { defaultValue: "Save your seller profile to match public Etsy market signals to your niche." })}</div>;
  }
  if (loading) {
    return <div className="rounded-xl border border-ink-200 bg-card p-8 text-center text-sm text-ink-500" role="status">{t("marketRadar.marketSignalsLoading", { defaultValue: "Calculating your niche from public Etsy data..." })}</div>;
  }
  if (error || !source) {
    return <div className="rounded-xl border border-dashed border-ink-300 bg-card p-8 text-center text-sm text-ink-500">{t("marketRadar.noMatchingSignals", { defaultValue: "No market group matches this seller profile yet." })}</div>;
  }
  return <CompetitorPanel insight={source} locale={locale} />;
}

function CompetitorPanel({ insight: source, locale }: { insight: SellerNicheMarketInsight; locale: string }) {
  const { t } = useTranslation("common");
  const insight = useLocalizedNiche(source, locale);
  const { signals } = insight;
  const unavailable = t("marketRadar.notEnoughData", { defaultValue: "Not enough data" });
  const topShare = signals.topSellerSharePercent;
  const strongShare = signals.sellerCount > 0 ? Math.round((signals.strongSellerCount / signals.sellerCount) * 100) : null;
  const ageMonths = signals.medianListingAgeDays == null ? null : Math.round((signals.medianListingAgeDays / 30) * 10) / 10;

  return (
    <Card className="gap-0 overflow-hidden border-ink-200 bg-card py-0 shadow-sm">
      <div className="flex flex-col gap-1 border-b border-ink-100 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold text-ink-900">{t("marketRadar.competitorTitle", { defaultValue: "Who you compete with" })}</h3>
          {signals.sellerCount > 0 && (
            <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-xs font-semibold text-ink-700">{t("marketRadar.shopsAtTop", { defaultValue: "{{count}} shops at the top", count: signals.sellerCount })}</span>
          )}
        </div>
        <p className="text-sm text-ink-500 capitalize">{insight.niche}</p>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-3">
        <MetricTile
          label={t("marketRadar.concentration", { defaultValue: "Who holds the top listings" })}
          value={topShare == null ? "—" : `${topShare}%`}
          caption={t("marketRadar.concentrationCaption", { defaultValue: "held by the 5 largest shops" })}
          progress={topShare}
          chart={signals.shareTiers ? <ShareDonut tiers={signals.shareTiers} /> : undefined}
          footerLeft={t("marketRadar.nicheHealth", { defaultValue: "Niche health" })}
          footerRight={topShare == null ? unavailable : topShare < 25 ? t("marketRadar.openNiche", { defaultValue: "Room for newcomers" }) : topShare > 40 ? t("marketRadar.dominatedNiche", { defaultValue: "Few shops dominate" }) : t("marketRadar.balancedNiche", { defaultValue: "Balanced" })}
          footerTone={topShare != null && topShare < 25 ? "up" : undefined}
        />
        <MetricTile
          label={t("marketRadar.tileStrongSellers", { defaultValue: "Strong competitors" })}
          value={signals.sellerCount > 0 ? `${signals.strongSellerCount} / ${signals.sellerCount}` : "—"}
          caption={t("marketRadar.tileStrongSellersCaption", { defaultValue: "Shops at the top gaining 3+ favorites a month" })}
          progress={strongShare}
          chart={signals.sellerCount > 0 ? <StrongSellerBar strong={signals.strongSellerCount} total={signals.sellerCount} /> : undefined}
          footerLeft={t("marketRadar.strongShare", { defaultValue: "Strong share" })}
          footerRight={strongShare == null ? unavailable : `${strongShare}%`}
        />
        <MetricTile
          label={t("marketRadar.listingAge", { defaultValue: "Typical listing age" })}
          value={ageMonths == null ? "—" : t("marketRadar.months", { defaultValue: "{{value}} mo", value: ageMonths })}
          caption={t("marketRadar.listingAgeCaption", { defaultValue: "Median age of the top listings" })}
          progress={ageMonths == null ? null : Math.min(100, (ageMonths / 24) * 100)}
          footerLeft={t("marketRadar.topIs", { defaultValue: "The top is" })}
          footerRight={ageMonths == null ? unavailable : ageMonths <= 6 ? t("marketRadar.freshTop", { defaultValue: "Fresh" }) : t("marketRadar.establishedTop", { defaultValue: "Established" })}
          footerTone={ageMonths != null && ageMonths <= 6 ? "up" : undefined}
        />
      </div>

      {signals.risingListings.length > 0 && (
        <div className="border-t border-ink-100 px-5 py-4">
          <p className="text-sm font-semibold text-ink-900">{t("marketRadar.listingsToLearnFrom", { defaultValue: "New listings to learn from" })}</p>
          <p className="text-xs text-ink-500">{t("marketRadar.listingsToLearnFromDescription", { defaultValue: "Under 90 days old and already gaining favorites. Study them; do not copy them." })}</p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-ink-100">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="bg-ink-50 text-[10px] tracking-[0.08em] text-ink-400 uppercase">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.listing", { defaultValue: "Listing" })}</th>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.age", { defaultValue: "Age" })}</th>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.favoritesPerMonth", { defaultValue: "Favorites / month" })}</th>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.listPrice", { defaultValue: "List price" })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {signals.risingListings.map((listing) => (
                  <tr key={`${listing.title}-${listing.url}`} className="hover:bg-ink-50/80">
                    <td className="max-w-72 truncate px-3 py-2.5">
                      {listing.url
                        ? <a className="text-blue-700 dark:text-blue-300 hover:underline" href={listing.url} target="_blank" rel="noreferrer" title={listing.title}>{listing.title}</a>
                        : <span title={listing.title}>{listing.title}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-ink-600 tabular-nums">{t("marketRadar.daysShort", { defaultValue: "{{value}} d", value: listing.ageDays })}</td>
                    <td className="px-3 py-2.5 font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">{listing.favoritesPer30Days}</td>
                    <td className="px-3 py-2.5 text-ink-600 tabular-nums">{listing.price == null ? "—" : `${formatMoney(listing.price)} ${listing.currency ?? ""}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {insight.competitors.length > 0 && (
        <div className="border-t border-ink-100 px-5 py-4">
          <p className="text-sm font-semibold text-ink-900">{t("marketRadar.shopsInTop", { defaultValue: "Shops with the most listings at the top" })}</p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-ink-100">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="bg-ink-50 text-[10px] tracking-[0.08em] text-ink-400 uppercase">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.shop", { defaultValue: "Shop" })}</th>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.listingsAtTop", { defaultValue: "Listings at top" })}</th>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.heroListing", { defaultValue: "Best listing" })}</th>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.listPrice", { defaultValue: "List price" })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {insight.competitors.slice(0, 8).map((competitor) => (
                  <tr key={competitor.sellerId} className="hover:bg-ink-50/80">
                    <td className="px-3 py-2.5 text-xs text-ink-500 tabular-nums">#{competitor.sellerId}</td>
                    <td className="px-3 py-2.5 font-semibold text-ink-800 tabular-nums">{competitor.listingCount}</td>
                    <td className="max-w-72 truncate px-3 py-2.5">
                      {competitor.representativeListingUrl
                        ? <a className="text-blue-700 dark:text-blue-300 hover:underline" href={competitor.representativeListingUrl} target="_blank" rel="noreferrer" title={competitor.representativeListingTitle}>{competitor.representativeListingTitle}</a>
                        : <span title={competitor.representativeListingTitle}>{competitor.representativeListingTitle}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-ink-600 tabular-nums">{competitor.representativePrice == null ? "—" : formatMoney(competitor.representativePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="border-t border-ink-100 px-5 py-3 text-[11px] text-ink-400">
        {t("marketRadar.publicSignalsNote", { defaultValue: "Favorites are public interest signals from Etsy, not sales or revenue." })}
      </p>
    </Card>
  );
}

/** Competition and demand of the opportunity's niche, shared with the niche view. */
function NicheMarketMetrics({ item }: { item: SellerOpportunity }) {
  const { t } = useTranslation("common");
  const market = item.nicheMarket;
  const unavailable = t("marketRadar.notEnoughData", { defaultValue: "Not enough data" });
  return (
    <>
      <LevelMetric
        label={t("marketRadar.competition")}
        level={market ? market.competitionLevel : null}
        unavailable={unavailable}
        detail={market && market.sellerCount > 0
          ? t("marketRadar.strongSellersDetail", { defaultValue: "{{strong}} strong of {{sellers}} at the top", strong: market.strongSellerCount, sellers: market.sellerCount })
          : market?.activeListingCount != null ? `${market.activeListingCount.toLocaleString()} active listings` : unavailable}
      />
      <LevelMetric
        label={t("marketRadar.demandProxy", { defaultValue: "Demand" })}
        level={market ? market.demandProxy : null}
        unavailable={unavailable}
        detail={market?.medianFavoritesPer30Days != null ? `${market.medianFavoritesPer30Days} favorites / 30 days` : unavailable}
      />
    </>
  );
}

/** A level shown as a three-step meter with its word, so it reads at a glance. */
function LevelMetric({ label, level, detail, unavailable }: { label: string; level: string | null; detail: string; unavailable: string }) {
  const known = level === "low" || level === "medium" || level === "high";
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-[0.08em] text-ink-400 uppercase">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {known && <LevelMeter level={level} />}
        <span className="truncate text-sm font-semibold text-ink-800 capitalize">{known ? level : unavailable}</span>
      </div>
      <p className="truncate text-[11px] text-ink-500">{detail}</p>
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatVerdict(value: SellerNicheMarketInsight["verdict"]) {
  return value.replaceAll("_", " ");
}

function RadarSnapshot({
  topOpportunity,
  newCount,
  savedCount,
  actedCount,
  onAnalyze,
  onState,
  analyzing,
}: {
  topOpportunity: SellerOpportunity;
  newCount: number;
  savedCount: number;
  actedCount: number;
  onAnalyze: () => void;
  onState: (state: SellerOpportunity["state"]) => void;
  analyzing: boolean;
}) {
  const { t } = useTranslation("common");
  const isSaved = topOpportunity.state === "saved";
  const isActed = topOpportunity.state === "acted";
  const insight = topOpportunity.insights;
  const price = insight.medianPrice == null
    ? t("marketRadar.priceUnavailable")
    : `${insight.medianPrice.toFixed(0)} ${insight.evidence.find((evidence) => evidence.currency)?.currency ?? ""}`.trim();
  const nextAction = isActed
    ? t("marketRadar.nextActionActed", { defaultValue: "Review the result and measure the listing when data is available." })
    : isSaved
      ? t("marketRadar.nextActionSaved", { defaultValue: "Use the evidence to shape a differentiated listing concept." })
      : t("marketRadar.nextActionReview", { defaultValue: "Review the evidence and run the AI analyst before committing time." });

  return (
    <Card className="gap-0 overflow-hidden border-blue-100 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/80 dark:from-blue-500/10 via-card to-card py-0 shadow-sm">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] text-blue-700 dark:text-blue-300 uppercase"><Target className="size-3.5" />{t("marketRadar.todayRadar")}</span>
            <span className="rounded-full bg-card px-2 py-0.5 text-[11px] text-ink-500 ring-1 ring-blue-100 dark:ring-blue-500/30">{t("marketRadar.topOpportunity")}</span>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">#{topOpportunity.rank ?? 1}</span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-ink-900">{topOpportunity.title}</h2>
              <p className="mt-1 text-sm leading-5 text-ink-600">{topOpportunity.fitExplanation ?? t("marketRadar.strongestMatch", { defaultValue: "Strongest current match for your seller profile." })}</p>
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-ink-500"><ArrowRight className="mt-0.5 size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />{nextAction}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="primaryBlue" size="sm" onClick={onAnalyze} disabled={analyzing}><Sparkles className="size-3.5" />{analyzing ? t("marketRadar.analyzing") : t("marketRadar.analyzeTopPick", { defaultValue: "Analyze top pick" })}</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onState(isActed ? "new" : "acted")}><Check className={isActed ? "size-3.5 fill-current" : "size-3.5"} />{isActed ? t("marketRadar.markedActed") : t("marketRadar.markActed")}</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onState(isSaved ? "new" : "saved")}><Bookmark className={isSaved ? "size-3.5 fill-current" : "size-3.5"} />{isSaved ? t("marketRadar.saved") : t("marketRadar.saveTopPick")}</Button>
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[28rem] lg:grid-cols-2">
          <SnapshotMetric label={t("marketRadar.newToReview")} value={String(newCount)} detail={t("marketRadar.opportunities")} />
          <SnapshotMetric label={t("marketRadar.saved")} value={String(savedCount)} detail={t("marketRadar.shortlisted")} />
          <SnapshotMetric label={t("marketRadar.acted")} value={String(actedCount)} detail={t("marketRadar.inProgress")} />
          <SnapshotMetric label={t("marketRadar.evidence")} value={String(insight.evidenceCount)} detail={`${insight.confidenceLabel} ${t("marketRadar.confidence").toLowerCase()}`} />
        </div>
      </div>
      <details className="group border-t border-blue-100 dark:border-blue-500/30">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-xs font-semibold text-ink-600 marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">{t("marketRadar.viewTopDetails", { defaultValue: "View top opportunity details" })}</span>
          <span className="hidden group-open:inline">{t("marketRadar.collapse")}</span>
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        </summary>
      <div className="grid gap-3 border-t border-blue-100 dark:border-blue-500/30 px-5 py-4 sm:grid-cols-2 lg:grid-cols-7">
        <NicheMarketMetrics item={topOpportunity} />
        <InsightMetric label={t("marketRadar.typicalPrice")} value={price} detail={insight.priceLabel} />
        <InsightMetric label={t("marketRadar.confidence", { defaultValue: "Confidence" })} value={insight.evidenceQuality} detail={`${insight.distinctListingCount} listings · ${insight.observationPeriodCount} day(s)`} />
        <InsightMetric label={t("marketRadar.freshness", { defaultValue: "Freshness" })} value={formatFreshness(insight.freshnessLabel, t)} detail={freshnessDetail(insight, t)} tone={insight.freshnessLabel === "fresh" ? "up" : insight.freshnessLabel === "stale" ? "down" : undefined} />
        <InsightMetric label={t("marketRadar.sellerFit")} value={`${Math.round(topOpportunity.sellerFitScore)}/100`} detail={t("marketRadar.profile")} />
        <InsightMetric label={t("marketRadar.fitScore")} value={`${Math.round(topOpportunity.finalScore)}/100`} detail={`#${topOpportunity.rank ?? 1} ${t("marketRadar.recommended").toLowerCase()}`} />
      </div>
      <ScoreComposition item={topOpportunity} />
      </details>
    </Card>
  );
}

function SnapshotMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-blue-100 dark:border-blue-500/30 bg-card/80 px-3 py-2.5">
      <p className="text-[10px] font-semibold tracking-[0.08em] text-ink-400 uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink-900 tabular-nums">{value}</p>
      <p className="text-[11px] text-ink-500">{detail}</p>
    </div>
  );
}

function ComparePanel({ items, onRemove }: { items: SellerOpportunity[]; onRemove: (id: string) => void }) {
  const { t } = useTranslation("common");
  const bestOverall = [...items].sort((a, b) => b.finalScore - a.finalScore)[0];
  const bestFit = [...items].sort((a, b) => b.sellerFitScore - a.sellerFitScore)[0];
  const lowestRisk = [...items].sort((a, b) => compareRisk(b) - compareRisk(a))[0];
  const marketLeader = [...items].sort((a, b) => b.marketOpportunityScore - a.marketOpportunityScore)[0];
  const rows = [
    [t("marketRadar.fitScore"), (item: SellerOpportunity) => `${Math.round(item.finalScore)}/100`],
    [t("marketRadar.market"), (item: SellerOpportunity) => `${Math.round(item.marketOpportunityScore)}/100`],
    [t("marketRadar.sellerFit"), (item: SellerOpportunity) => `${Math.round(item.sellerFitScore)}/100`],
    [t("marketRadar.engagement"), (item: SellerOpportunity) => item.insights.engagementRate == null ? "—" : `${item.insights.engagementRate.toFixed(2)}%`],
    [t("marketRadar.competition"), (item: SellerOpportunity) => item.insights.competitionLevel],
    [t("marketRadar.typicalPrice"), (item: SellerOpportunity) => item.insights.medianPrice == null ? "—" : `${item.insights.medianPrice.toFixed(0)} ${item.insights.evidence.find((evidence) => evidence.currency)?.currency ?? ""}`.trim()],
    [t("marketRadar.confidence"), (item: SellerOpportunity) => item.insights.confidenceLabel],
  ] as const;

  return (
    <Card className="gap-0 overflow-hidden border-ink-200 bg-card py-0 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
        <div className="flex items-center gap-2"><GitCompareArrows className="size-4 text-blue-600 dark:text-blue-400" /><div><h2 className="font-semibold text-ink-900">{t("marketRadar.compareTitle")}</h2><p className="text-xs text-ink-500">{t("marketRadar.compareDescription")}</p></div></div>
        <span className="rounded-full bg-blue-50 dark:bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">{items.length}/3</span>
      </div>
      <div className="grid gap-3 border-b border-ink-100 bg-ink-50/70 p-4 lg:grid-cols-3">
        <CompareInsight
          label={t("marketRadar.recommendedPick", { defaultValue: "Recommended first test" })}
          title={bestOverall.title}
          detail={`${Math.round(bestOverall.finalScore)}/100 fit score · ${bestOverall.insights.evidenceQuality} evidence`}
          tone="blue"
        />
        <CompareInsight
          label={t("marketRadar.bestSellerFit", { defaultValue: "Best seller fit" })}
          title={bestFit.title}
          detail={`${Math.round(bestFit.sellerFitScore)}/100 seller fit · ${bestFit.category ?? t("marketRadar.categoryUnknown", { defaultValue: "category not set" })}`}
          tone="green"
        />
        <CompareInsight
          label={t("marketRadar.lowestRisk", { defaultValue: "Lowest validation risk" })}
          title={lowestRisk.title}
          detail={`${lowestRisk.insights.confidenceLabel} confidence · ${lowestRisk.insights.competitionLevel} competition`}
          tone="amber"
        />
        {marketLeader.id !== bestOverall.id && (
          <p className="text-xs leading-5 text-ink-500 lg:col-span-3">
            {t("marketRadar.compareTradeoff", { defaultValue: "Trade-off" })}: <span className="font-medium text-ink-700">{marketLeader.title}</span> has the strongest market score ({Math.round(marketLeader.marketOpportunityScore)}), but <span className="font-medium text-ink-700">{bestOverall.title}</span> is the better first test for this seller profile.
          </p>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <thead className="bg-ink-50 text-xs text-ink-500">
            <tr>
              <th className="w-32 px-5 py-3 font-medium">{t("marketRadar.signal")}</th>
              {items.map((item) => <th key={item.id} className="min-w-44 px-4 py-3 font-medium"><div className="flex items-start justify-between gap-2"><span className="truncate text-ink-800" title={item.title}>{item.title}</span><button type="button" aria-label={`Remove ${item.title} from comparison`} className="shrink-0 text-ink-400 hover:text-ink-700" onClick={() => onRemove(item.id)}><X className="size-3.5" /></button></div></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, value]) => <tr key={label} className="border-t border-ink-100"><th className="px-5 py-2.5 text-xs font-medium text-ink-500">{label}</th>{items.map((item) => <td key={item.id} className="px-4 py-2.5 font-semibold text-ink-800 capitalize">{value(item)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function CompareInsight({
  label,
  title,
  detail,
  tone,
}: {
  label: string;
  title: string;
  detail: string;
  tone: "blue" | "green" | "amber";
}) {
  const toneClass = tone === "green"
    ? "border-emerald-100 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10"
    : tone === "amber"
      ? "border-amber-100 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10"
      : "border-blue-100 dark:border-blue-500/30 bg-blue-50/70 dark:bg-blue-500/10";
  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClass}`}>
      <p className="text-[10px] font-bold tracking-[0.1em] text-ink-500 uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-ink-900" title={title}>{title}</p>
      <p className="mt-1 text-xs text-ink-600">{detail}</p>
    </div>
  );
}

function compareRisk(item: SellerOpportunity) {
  const evidence = { supported: 3, early: 2, insufficient: 1 }[item.insights.evidenceQuality] ?? 0;
  const confidence = { high: 3, medium: 2, low: 1 }[item.insights.confidenceLabel] ?? 0;
  const competition = { low: 3, medium: 2, high: 1, unknown: 0 }[item.insights.competitionLevel] ?? 0;
  return evidence * 3 + confidence * 2 + competition;
}

function CompactProfileSummary({ profile }: { profile: SellerResearchProfileInput }) {
  const { t } = useTranslation("common");
  const categories = profile.preferredCategories.slice(0, 2);
  const price = profile.minimumPrice != null || profile.maximumPrice != null
    ? `$${profile.minimumPrice ?? 0} - ${profile.maximumPrice != null ? `$${profile.maximumPrice}` : t("marketRadar.anyPrice", { defaultValue: "any" })}`
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink-100 px-5 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink-700" title={profile.shopGoal ?? undefined}>{profile.shopGoal || t("marketRadar.notSet")}</p>
        <p className="mt-0.5 text-[11px] text-ink-400">{categories.length > 0 ? categories.join(" · ") : t("marketRadar.notSet")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {price && <span className="rounded-full bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 text-blue-700 dark:text-blue-300 ring-1 ring-blue-100 dark:ring-blue-500/30">{price}</span>}
        {profile.targetAudiences.length > 0 && <span className="text-ink-500">{profile.targetAudiences.length} {t("marketRadar.audiences", { defaultValue: "audiences" })}</span>}
        {profile.preferredKeywords.length > 0 && <span className="text-ink-500">{profile.preferredKeywords.length} {t("marketRadar.keywords", { defaultValue: "keywords" })}</span>}
      </div>
    </div>
  );
}

function ProfileField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const { t } = useTranslation("common");
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2"><Label htmlFor={id}>{label}</Label><span className="text-[11px] text-ink-400">{t("marketRadar.separateWithCommas")}</span></div>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function EmptyRadar({ hasProfile, filtered, stateName, building, onBuild, onSetup }: { hasProfile: boolean; filtered: boolean; stateName: string; building: boolean; onBuild: () => void; onSetup: () => void }) {
  const { t } = useTranslation("common");
  if (filtered) {
    return <div className="rounded-xl border border-dashed border-ink-300 bg-card p-10 text-center text-sm text-ink-500">{t("marketRadar.noData", { state: stateName.toLowerCase() })}</div>;
  }
  return (
    <div className="rounded-xl border border-dashed border-ink-300 bg-card p-12 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"><Sparkles className="size-6" /></span>
      <h3 className="mt-4 font-semibold text-ink-900">{hasProfile ? t("marketRadar.radarReady") : t("marketRadar.setupProfile")}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
        {hasProfile
          ? t("marketRadar.radarReadyDescription", { defaultValue: "Your profile is saved. Build the radar after market data has been collected by the research sync." })
          : t("marketRadar.setupProfileDescription", { defaultValue: "Tell the radar about your shop goal, audiences and price range so opportunities can be ranked for you." })}
      </p>
      {hasProfile ? (
        <Button className="mt-5" type="button" onClick={onBuild} disabled={building}><RefreshCw className={building ? "size-4 animate-spin" : "size-4"} />{building ? t("marketRadar.building") : t("marketRadar.buildRadar")}</Button>
      ) : (
        <Button className="mt-5" type="button" onClick={onSetup}><SlidersHorizontal className="size-4" />{t("marketRadar.fillProfile")}</Button>
      )}
    </div>
  );
}

function OpportunitySkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-ink-200 bg-card p-5">
      <div className="flex justify-between gap-4">
        <div className="flex-1 space-y-3"><div className="h-3 w-24 rounded bg-ink-100" /><div className="h-5 w-2/3 rounded bg-ink-100" /><div className="h-3 w-20 rounded bg-ink-100" /></div>
        <div className="size-14 rounded-full bg-ink-100" />
      </div>
      <div className="mt-5 h-3 w-full rounded bg-ink-100" /><div className="mt-2 h-3 w-4/5 rounded bg-ink-100" />
      <div className="mt-5 h-16 rounded-xl bg-ink-50" />
    </div>
  );
}

function OpportunityMeta({ item, featured = false }: { item: SellerOpportunity; featured?: boolean }) {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-md bg-[#17263f] px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">#{item.rank ?? "—"}</span>
      {featured && <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-[11px] font-semibold text-white"><Trophy className="size-3" />{t("marketRadar.topPick")}</span>}
      <span className="text-[11px] font-semibold tracking-[0.12em] text-ink-400 uppercase">{item.platform}</span>
      <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 " + stateStyle[item.state]}>{stateLabel[item.state]}</span>
    </div>
  );
}

function OpportunityActions({ item, busy, analysis, analyzing, onAnalyze, onState, isCompared, onCompare, compact = false }: CardActions & { item: SellerOpportunity; compact?: boolean }) {
  const { t } = useTranslation("common");
  const isSaved = item.state === "saved";
  const isActed = item.state === "acted";
  return (
    <>
      <Button type="button" variant="primaryBlue" size="sm" className="px-3 sm:px-4" disabled={analyzing} onClick={onAnalyze}><Sparkles className="size-3.5" />{analyzing ? t("marketRadar.analyzing") : compact ? t("marketRadar.analyze") : analysis ? t("marketRadar.analyzeAgain") : <>{t("marketRadar.analyze")}<span className="hidden sm:inline">&nbsp;{t("marketRadar.withAi", { defaultValue: "with AI" })}</span></>}</Button>
      <Button type="button" variant="outline" size="sm" className={"px-3 sm:px-4 " + (isSaved ? "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:border-amber-400 hover:text-amber-800 dark:hover:text-amber-300" : "")} disabled={busy} onClick={() => onState(isSaved ? "new" : "saved")}><Bookmark className={isSaved ? "size-3.5 fill-current" : "size-3.5"} />{isSaved ? t("marketRadar.saved") : t("marketRadar.save")}</Button>
      <Button type="button" variant="outline" size="sm" className={"px-3 sm:px-4 " + (isActed ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "")} disabled={busy} onClick={() => onState(isActed ? "new" : "acted")}><Check className={isActed ? "size-3.5 fill-current" : "size-3.5"} />{isActed ? t("marketRadar.acted") : t("marketRadar.markActed")}</Button>
      <Button type="button" variant="ghost" size="sm" className={"px-3 sm:px-4 " + (isCompared ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300" : "text-ink-500")} onClick={onCompare}><GitCompareArrows className="size-3.5" />{isCompared ? t("marketRadar.compared") : t("marketRadar.compare")}</Button>
      <Button type="button" variant="ghost" size="sm" className={"px-3 text-ink-500 sm:px-4 " + (compact ? "" : "ml-auto")} disabled={busy} onClick={() => onState("ignored")}>{t("marketRadar.ignore")}</Button>
    </>
  );
}

function OpportunityCard({ item, featured, ...actions }: CardActions & { item: SellerOpportunity; featured: boolean }) {
  const { t } = useTranslation("common");
  return (
    <Card className={"flex flex-col gap-0 bg-card py-0 shadow-sm transition-shadow hover:shadow-md " + (featured ? "border-amber-200 dark:border-amber-500/30 ring-1 ring-amber-100 dark:ring-amber-500/30 lg:col-span-2" : "border-ink-200")}>
      <div className={"flex flex-1 flex-col gap-4 p-5 " + (featured ? "bg-gradient-to-br from-amber-50/60 dark:from-amber-500/10 via-card to-card" : "")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <OpportunityMeta item={item} featured={featured} />
            <h3 className={"mt-2 leading-snug font-semibold text-ink-900 " + (featured ? "text-xl" : "text-lg")}>{item.title}</h3>
            <p className="mt-0.5 text-sm text-ink-500 capitalize">{item.category ?? item.niche}</p>
          </div>
          <ScoreRing item={item} />
        </div>

        {featured ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center">
            <ListingOverview summary={item.summary} />
            <ScoreBars item={item} />
          </div>
        ) : (
          <>
            <ScoreBars item={item} compact />
            <OpportunityInsights item={item} compact />
            <details className="group rounded-xl border border-ink-100 bg-ink-50/60 px-3 py-2">
              <summary className="cursor-pointer list-none text-xs font-semibold text-ink-600 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">{t("marketRadar.viewDetails", { defaultValue: "View supporting details" })}</span>
                <span className="hidden group-open:inline">{t("marketRadar.collapse", { defaultValue: "Collapse details" })}</span>
              </summary>
              <div className="mt-3 space-y-3 border-t border-ink-200 pt-3">
                <ListingOverview summary={item.summary} />
                <p className="flex items-start gap-1.5 text-xs leading-5 text-ink-500"><CircleHelp className="mt-0.5 size-3.5 shrink-0" />{item.fitExplanation ?? t("marketRadar.rankedContext")}</p>
                <OpportunityInsights item={item} />
                {actions.analysis && <AnalysisPanel analysis={actions.analysis} />}
              </div>
            </details>
          </>
        )}

        {featured && <OpportunityInsights item={item} />}

        {featured && <p className="flex items-start gap-1.5 text-xs leading-5 text-ink-500"><CircleHelp className="mt-0.5 size-3.5 shrink-0" />{item.fitExplanation ?? t("marketRadar.rankedContext")}</p>}

        {featured && actions.analysis && (
          <details className="group rounded-xl border border-blue-100 dark:border-blue-500/30 bg-blue-50/30 dark:bg-blue-500/10">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">{t("marketRadar.viewAiAnalysis", { defaultValue: "View AI analysis" })}</span>
              <span className="hidden group-open:inline">{t("marketRadar.collapse")}</span>
              <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
            </summary>
            <div className="border-t border-blue-100 dark:border-blue-500/30 p-3"><AnalysisPanel analysis={actions.analysis} /></div>
          </details>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 px-5 py-3">
        <OpportunityActions item={item} {...actions} />
      </div>
    </Card>
  );
}

function OpportunityInsights({ item, compact = false }: { item: SellerOpportunity; compact?: boolean }) {
  const { t } = useTranslation("common");
  const insight = item.insights;
  const priceText = insight.medianPrice == null
    ? t("marketRadar.priceUnavailable")
    : `${insight.medianPrice.toFixed(0)} ${insight.evidence.find((evidence) => evidence.currency)?.currency ?? ""}`.trim();

  return (
    <div className={(compact ? "" : "space-y-3 ") + "rounded-xl border border-ink-100 bg-ink-50/80 p-3"}>
        <div className="grid gap-3 sm:grid-cols-5">
        <NicheMarketMetrics item={item} />
        <InsightMetric label={insight.priceLabel === "observed" ? t("marketRadar.observedPrice") : t("marketRadar.typicalPrice")} value={priceText} detail={insight.minimumPrice == null || insight.maximumPrice == null ? t("marketRadar.limitedPriceData") : `${insight.minimumPrice.toFixed(0)}–${insight.maximumPrice.toFixed(0)} range`} />
        <InsightMetric label={t("marketRadar.confidence", { defaultValue: "Confidence" })} value={insight.evidenceQuality} detail={`${insight.distinctListingCount} listings · ${insight.observationPeriodCount} day(s)`} />
        <InsightMetric label={t("marketRadar.freshness", { defaultValue: "Freshness" })} value={formatFreshness(insight.freshnessLabel, t)} detail={freshnessDetail(insight, t)} tone={insight.freshnessLabel === "fresh" ? "up" : insight.freshnessLabel === "stale" ? "down" : undefined} />
      </div>
      {!compact && <>
      {item.nicheMarket && item.nicheMarket.risingNewListingCount > 0 && (
        <p className="rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-xs leading-5 text-emerald-800 dark:text-emerald-300">
          {t("marketRadar.nicheOpenForNewSellers", { defaultValue: "{{count}} listing(s) under 90 days old in this niche already gain favorites quickly." , count: item.nicheMarket.risingNewListingCount })}
        </p>
      )}
      {insight.evidenceQuality === "insufficient" && (
        <p className="rounded-lg border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-300">
          {t("marketRadar.earlySignal", { defaultValue: "Early signal only — collect more listings and observation periods before making a large investment." })}
        </p>
      )}

      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-ink-600 marker:text-ink-400">{t("marketRadar.whyScore")}</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(insight.marketScoreBreakdown)
            .filter(([key]) => !["formulaVersion", "viralScore"].includes(key))
            .map(([key, value]) => (
              <span key={key} className="rounded-full bg-card px-2 py-1 text-[11px] text-ink-600 ring-1 ring-ink-200">
                {humanizeInsightKey(key)}: {typeof value === "number" ? value.toFixed(0) : value}
              </span>
            ))}
        </div>
        <div className="mt-2 space-y-1 text-xs text-ink-500">
          <p>{t("marketRadar.observedFrom", { from: new Date(insight.firstObservedAt).toLocaleDateString(), to: new Date(insight.lastObservedAt).toLocaleDateString() })}</p>
          {insight.evidence.slice(0, 3).map((evidence) => (
            <p key={`${evidence.title}-${evidence.observedAt}`} className="truncate">
              {evidence.sourceUrl ? <a className="text-blue-600 dark:text-blue-400 hover:underline" href={evidence.sourceUrl} target="_blank" rel="noreferrer">{evidence.title}</a> : evidence.title}
              {evidence.views != null && evidence.favorites != null ? ` · ${evidence.favorites} favorites / ${evidence.views} views` : ""}
            </p>
          ))}
        </div>
      </details>
      </>}
    </div>
  );
}

function ListingOverview({ summary }: { summary: string | null }) {
  const { t } = useTranslation("common");
  const sections = splitSummarySections(summary);
  return (
    <details className="group rounded-xl border border-ink-100 bg-ink-50/70 p-3">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 min-h-12 text-sm leading-6 text-ink-600">
            {cleanSummary(summary)}
          </p>
          <span className="shrink-0 pt-1 text-xs font-semibold text-blue-600 dark:text-blue-400 group-open:text-ink-500">
            <span className="group-open:hidden">{t("marketRadar.readFull")}</span>
            <span className="hidden group-open:inline">{t("marketRadar.collapse")}</span>
          </span>
        </div>
      </summary>
      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto border-t border-ink-200 pt-3 text-sm leading-6 text-ink-700">
        {sections.map((section, index) => (
          <div key={`${section.slice(0, 24)}-${index}`} className={isSummaryHeading(section) ? "space-y-1" : undefined}>
            {isSummaryHeading(section) ? (
              <h4 className="text-xs font-bold tracking-[0.12em] text-ink-500 uppercase">{section}</h4>
            ) : (
              <p className="whitespace-pre-wrap">{section}</p>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

function InsightMetric({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: string }) {
  const valueTone = tone === "up" ? "text-emerald-700 dark:text-emerald-300" : tone === "down" ? "text-rose-700 dark:text-rose-300" : "text-ink-800";
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-[0.08em] text-ink-400 uppercase">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold capitalize ${valueTone}`}>{value}</p>
      <p className="truncate text-[11px] text-ink-500">{detail}</p>
    </div>
  );
}

function ScoreMeter({ value, tone = "blue" }: { value: number; tone?: "blue" | "green" | "amber" | "slate" }) {
  const score = Math.round(value);
  const bar = tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : tone === "slate" ? "bg-ink-400" : "bg-blue-500";
  return (
    <div className="w-28 min-w-28">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-ink-700 tabular-nums"><span>{score}</span><span className="text-[10px] font-normal text-ink-400">/100</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-200"><div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} /></div>
    </div>
  );
}

function ScoreComposition({ item }: { item: SellerOpportunity }) {
  const { t } = useTranslation("common");
  const adjustedMarket = item.fitBreakdown.evidenceAdjustedMarketScore ?? item.marketOpportunityScore;
  const marketContribution = adjustedMarket * 0.6;
  const sellerContribution = item.sellerFitScore * 0.4;
  return (
    <div className="border-t border-blue-100 dark:border-blue-500/30 bg-blue-50/30 dark:bg-blue-500/10 px-5 py-4">
      <p className="text-[10px] font-bold tracking-[0.12em] text-ink-500 uppercase">{t("marketRadar.scoreComposition", { defaultValue: "Score composition" })}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <ContributionBar label={`${t("marketRadar.market")} · 60%`} value={marketContribution} detail={`${Math.round(adjustedMarket)}/100`} tone="blue" />
        <ContributionBar label={`${t("marketRadar.sellerFit")} · 40%`} value={sellerContribution} detail={`${Math.round(item.sellerFitScore)}/100`} tone="green" />
      </div>
    </div>
  );
}

function ContributionBar({ label, value, detail, tone }: { label: string; value: number; detail: string; tone: "blue" | "green" }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-xs text-ink-600"><span>{label}</span><span className="font-semibold text-ink-800 tabular-nums">{detail}</span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-card ring-1 ring-blue-100 dark:ring-blue-500/30"><div className={`h-full rounded-full ${tone === "green" ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} /></div>
    </div>
  );
}

function formatInsightType(value: SellerMarketInsight["insightType"]) {
  return value.replaceAll("_", " ");
}

function formatFreshness(label: SellerOpportunity["insights"]["freshnessLabel"], t: TFunction) {
  return t(`marketRadar.${label}`, { defaultValue: label });
}

function freshnessDetail(insight: SellerOpportunity["insights"], t: TFunction) {
  return insight.freshnessAgeDays == null
    ? t("marketRadar.unknown", { defaultValue: "Unknown" })
    : t("marketRadar.freshnessDetail", { days: insight.freshnessAgeDays });
}

function humanizeInsightKey(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (value) => value.toUpperCase());
}

function cleanSummary(summary: string | null) {
  const value = summary ?? "Market signal collected from public listing evidence.";
  return value
    .replace(/&#39;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function splitSummarySections(summary: string | null) {
  return cleanSummary(summary)
    .replace(/\s*-{3,}\s*/g, "\n\n")
    .replace(/\s+(?=[➤▶]\s*)/g, "\n")
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean);
}

function isSummaryHeading(section: string) {
  const normalized = section.replace(/[^A-Za-z ]/g, "").trim();
  return normalized.length > 3 && normalized.length < 64 && normalized === normalized.toUpperCase();
}

function OpportunityRow({ item, ...actions }: CardActions & { item: SellerOpportunity }) {
  const { t } = useTranslation("common");
  const score = Math.round(item.finalScore);
  return (
    <Fragment>
      <div className="grid gap-3 border-b border-ink-100 px-4 py-3 last:border-b-0 hover:bg-ink-50/60 md:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,16rem)_auto] md:items-center md:gap-5">
        <div className="min-w-0">
          <OpportunityMeta item={item} />
          <p className="mt-1 truncate font-semibold text-ink-900" title={item.title}>{item.title}</p>
          <p className="truncate text-xs text-ink-500"><span className="capitalize">{item.category ?? item.niche}</span>{item.fitExplanation ? ` · ${item.fitExplanation}` : ` · ${t("marketRadar.rankedContext")}`}</p>
        </div>
        <FitScoreTooltip item={item}>
          <button type="button" className={"w-fit cursor-help text-2xl font-bold tabular-nums md:mx-auto " + scoreTone(score).text} aria-label={`Fit score ${score}. How is this calculated?`}>{score}</button>
        </FitScoreTooltip>
        <ScoreBars item={item} compact />
        <div className="flex flex-wrap items-center gap-1.5 md:justify-end"><OpportunityActions item={item} {...actions} compact /></div>
      </div>
      {actions.analysis && (
        <details className="group border-b border-ink-100 bg-ink-50/60 px-4 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-ink-600 marker:hidden [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">{t("marketRadar.viewAiAnalysis", { defaultValue: "View AI analysis" })}</span>
            <span className="hidden group-open:inline">{t("marketRadar.collapse")}</span>
            <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
          </summary>
          <div className="pt-3"><AnalysisPanel analysis={actions.analysis} /></div>
        </details>
      )}
    </Fragment>
  );
}

function AnalysisPanel({ analysis }: { analysis: OpportunityAnalysis }) {
  const { t } = useTranslation("common");
  return (
    <div className="rounded-xl border border-blue-100 dark:border-blue-500/30 bg-gradient-to-br from-blue-50/80 dark:from-blue-500/10 to-indigo-50/40 dark:to-indigo-500/10 p-4 text-sm text-ink-700">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-semibold text-ink-900"><Sparkles className="size-4 text-blue-600 dark:text-blue-400" />{t("marketRadar.aiAnalyst", { defaultValue: "AI analyst" })}</p>
        <span className="rounded-full bg-card px-2 py-0.5 text-[11px] text-ink-500 ring-1 ring-blue-100 dark:ring-blue-500/30">{analysis.model}</span>
      </div>
      <p className="mt-2 leading-6">{analysis.summary}</p>
      <p className="mt-3 rounded-lg border-l-2 border-blue-500 bg-card/70 px-3 py-2 font-medium text-blue-900 dark:text-blue-300">{analysis.recommendation}</p>
      {analysis.actionPlan.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {analysis.actionPlan.slice(0, 3).map((step, index) => (
            <li key={step} className="flex gap-2"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">{index + 1}</span><span>{step}</span></li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-ink-500">{analysis.confidenceNote}</p>
    </div>
  );
}

// How the backend builds the fit score (SellerOpportunityScorer): 60% market, 40% seller fit.
function FitScoreTooltip({ item, children }: { item: SellerOpportunity; children: ReactNode }) {
  const { t } = useTranslation("common");
  const rawMarket = Math.round(item.marketOpportunityScore);
  const adjustedMarket = Math.round(item.fitBreakdown.evidenceAdjustedMarketScore ?? item.marketOpportunityScore);
  const fit = Math.round(item.sellerFitScore);
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="left" className="max-w-64 space-y-1 bg-[#17263f] px-3 py-2 text-xs text-white">
        <p className="font-semibold text-white">{t("marketRadar.fitFormula", { defaultValue: "Fit score = 60% Market + 40% Seller fit" })}</p>
        <p className="text-ink-300 tabular-nums">{adjustedMarket} × 0.6 + {fit} × 0.4 = {Math.round(item.finalScore)}</p>
        <p className="text-ink-400">{rawMarket} raw market → {adjustedMarket} {t("marketRadar.adjustedMarket", { defaultValue: "adjusted market" })} after evidence and freshness.</p>
        <p className="text-ink-400">{t("marketRadar.confidenceExplanation", { defaultValue: "Confidence shows how much evidence backs the market score. It does not change the fit score." })}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Final score as a ring: the arc fills to the score out of 100.
function ScoreRing({ item }: { item: SellerOpportunity }) {
  const { t } = useTranslation("common");
  const score = Math.round(item.finalScore);
  const tone = scoreTone(score);
  const circumference = 2 * Math.PI * 24;
  return (
    <FitScoreTooltip item={item}>
      <button type="button" className="flex shrink-0 cursor-help flex-col items-center" aria-label={`Fit score ${score}. How is this calculated?`}>
        <span className="relative size-14">
          <svg viewBox="0 0 56 56" className="size-14 -rotate-90">
            <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5" className="stroke-ink-100" />
            <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5" strokeLinecap="round" className={tone.ring} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(Math.max(score, 0), 100) / 100)} />
          </svg>
          <span className={"absolute inset-0 flex items-center justify-center text-base font-bold tabular-nums " + tone.text}>{score}</span>
        </span>
        <span className="mt-1 flex items-center gap-0.5 text-[10px] tracking-wider text-ink-400 uppercase">{t("marketRadar.fitScore")}<CircleHelp className="size-2.5" /></span>
      </button>
    </FitScoreTooltip>
  );
}

function ScoreBars({ item, compact = false }: { item: SellerOpportunity; compact?: boolean }) {
  const { t } = useTranslation("common");
  return (
    <div className={"grid grid-cols-3 " + (compact ? "gap-3" : "gap-4 rounded-xl bg-ink-50 p-3")}>
      <ScoreBar label={t("marketRadar.market")} value={item.marketOpportunityScore} />
      <ScoreBar label={compact ? t("marketRadar.fitShort", { defaultValue: "Fit" }) : t("marketRadar.sellerFit")} value={item.sellerFitScore} />
      <ScoreBar label={compact ? t("marketRadar.confidenceShort", { defaultValue: "Conf." }) : t("marketRadar.confidence")} value={item.confidence * 100} />
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const score = Math.round(value);
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-1"><p className="truncate text-[11px] text-ink-500">{label}</p><p className="text-sm font-semibold text-ink-800 tabular-nums">{score}</p></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-200"><div className={"h-full rounded-full " + scoreTone(score).bar} style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} /></div>
    </div>
  );
}
