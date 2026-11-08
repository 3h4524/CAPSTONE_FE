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
import { LevelMeter, PriceInterestScatter, ShareDonut, StrongSellerBar, SupplySparkline } from "@/components/opportunities/market-charts";
import { CompetitorLeaderboard, CompetitorPriceStrip, InfoTip, ListingAgeBars, MiniStats, NicheMapCard, NicheSelect, PriceSweetSpot, ProfileImpactCard, SeasonalWindowCard } from "@/components/opportunities/market-insights";
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
// Kept outside the opportunity prefix: a state change or a ranking refresh does not change a saved analysis,
// so invalidating the lists must not refetch every analysis with them.
const analysisQueryKey = (id: string) => ["seller-opportunity-analysis", id] as const;

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
  new: "bg-blue-50 text-blue-700 ring-blue-100",
  saved: "bg-amber-50 text-amber-700 ring-amber-100",
  ignored: "bg-slate-100 text-slate-500 ring-slate-200",
  acted: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  dismissed: "bg-slate-100 text-slate-500 ring-slate-200",
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
    ? { text: "text-emerald-600", bar: "bg-emerald-500", ring: "stroke-emerald-500" }
    : score >= 50
      ? { text: "text-amber-600", bar: "bg-amber-500", ring: "stroke-amber-500" }
      : { text: "text-slate-500", bar: "bg-slate-400", ring: "stroke-slate-400" };

const timeAgo = (iso: string, locale = "en") => {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto", style: "narrow" });
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return format.format(0, "second");
  if (minutes < 60) return format.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return format.format(-hours, "hour");
  return format.format(-Math.round(hours / 24), "day");
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
      // The refresh returns the unfiltered ranking, so it seeds the All list; filtered lists refetch.
      queryClient.setQueryData(opportunityQueryKey(userId, "all"), data);
      queryClient.invalidateQueries({ queryKey: [...opportunityKey, userId], predicate: (query) => query.queryKey[2] !== "all" });
      queryClient.invalidateQueries({ queryKey: marketInsightKey(userId) });
      if (data.length > 0) {
           toast.success(`${t("marketRadar.opportunities")}: ${data.length}`);
      } else {
         toast.info(t("marketRadar.noData", { state: t("marketRadar.all").toLowerCase() }));
      }
    },
     onError: () => toast.error(t("marketRadar.buildRadar")),
  });
  // A suggested keyword is saved to the profile and the radar re-ranked at once, so its effect shows
  // without a trip through the form and the refresh button.
  const [addingKeyword, setAddingKeyword] = useState<string | null>(null);
  const addKeyword = async (keyword: string) => {
    if (profile.preferredKeywords.some((item) => item.toLowerCase() === keyword.toLowerCase())) return;
    setAddingKeyword(keyword);
    try {
      await saveMutation.mutateAsync({ ...profile, preferredKeywords: [...profile.preferredKeywords, keyword] });
      await refreshMutation.mutateAsync();
    } catch {
      // Both mutations already report their failure with a toast.
    } finally {
      setAddingKeyword(null);
    }
  };
  const stateMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: SellerOpportunity["state"] }) => updateSellerOpportunityState(id, state),
    // Save / Ignore / Acted show at once; the lists are reconciled with the server afterwards.
    onMutate: async ({ id, state }) => {
      const listsKey = [...opportunityKey, userId];
      await queryClient.cancelQueries({ queryKey: listsKey });
      const previous = queryClient.getQueriesData<SellerOpportunity[]>({ queryKey: listsKey });
      queryClient.setQueriesData<SellerOpportunity[]>({ queryKey: listsKey }, (list) =>
        list?.map((item) => (item.id === id ? { ...item, state } : item)));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error(t("marketRadar.updateError", { defaultValue: "Could not update this opportunity" }));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: [...opportunityKey, userId] }),
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
  // A saved analysis is only shown on the cards of the current page, so only those are fetched;
  // each is cached, so paging back does not request it again.
  const savedAnalysisQueries = useQueries({
    queries: pagedOpportunities.map((item) => ({
      queryKey: analysisQueryKey(item.id),
      queryFn: () => getLatestSellerOpportunityAnalysis(item.id),
      enabled: canLoadSellerData && tab === "radar",
      staleTime: 5 * 60_000,
    })),
  });
  const persistedAnalysis = useMemo(() => {
    const result: Record<string, OpportunityAnalysis> = {};
    pagedOpportunities.forEach((item, index) => {
      const saved = savedAnalysisQueries[index]?.data;
      if (saved) result[item.id] = saved;
    });
    return result;
  }, [pagedOpportunities, savedAnalysisQueries]);
  // The hero counts what a seller can act on, not totals: strong fits, rising demand, and what is still unreviewed.
  const heroStats = useMemo(() => ({
    strong: allOpportunities.filter((item) => item.finalScore >= 75).length,
    rising: allOpportunities.filter((item) => item.insights.engagementTrend === "up").length,
  }), [allOpportunities]);
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
  const localizedTitles = useMemo(
    () => new Map(localizedAllOpportunities.map((item) => [item.id, item.title])),
    [localizedAllOpportunities],
  );
  // The niche tab ranks against the saved profile price range, not the unsaved form.
  const savedPriceRange = {
    minimumPrice: profileQuery.data?.minimumPrice ?? null,
    maximumPrice: profileQuery.data?.maximumPrice ?? null,
  };
  // One niche is in focus across the Niche overview and Competitors tabs; the best match comes first.
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const nicheInsight = marketInsightsQuery.data?.find((insight) => insight.niche === selectedNiche) ?? marketInsightsQuery.data?.[0];
  // Niche insights are read live from collected observations, so a later observation day means the ranking is behind the data.
  // Both values are UTC; observations are tracked per day, so the comparison is by day.
  const latestMarketDataOn = useMemo(
    () => (marketInsightsQuery.data ?? []).reduce<string | null>((latest, item) => {
      const observedOn = item.marketSupply?.latestObservedOn;
      return observedOn && (!latest || observedOn > latest) ? observedOn : latest;
    }, null),
    [marketInsightsQuery.data],
  );
  const rankingIsStale = Boolean(lastEvaluatedAt && latestMarketDataOn && latestMarketDataOn.slice(0, 10) > lastEvaluatedAt.slice(0, 10));
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
                 <p className="mt-0.5 text-sm text-slate-300">{t("marketRadar.subtitle")}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.06]">
                 <HeroStat
                   label={t("marketRadar.heroStrongFit", { defaultValue: "Strong fit" })}
                   value={allOpportunities.length ? String(heroStats.strong) : "—"}
                   suffix={allOpportunities.length ? `/${allOpportunities.length}` : undefined}
                   accent={heroStats.strong > 0 ? "text-emerald-300" : undefined}
                   hint={t("marketRadar.heroStrongFitHint", { defaultValue: "Opportunities scoring 75+ for market potential and fit with your profile." })}
                 />
                 <HeroStat
                   label={t("marketRadar.heroRising", { defaultValue: "Rising demand" })}
                   value={allOpportunities.length ? String(heroStats.rising) : "—"}
                   accent={heroStats.rising > 0 ? "text-sky-300" : undefined}
                   hint={t("marketRadar.heroRisingHint", { defaultValue: "Niches whose buyer engagement is trending up across recent observations." })}
                 />
                 <HeroStat
                   label={t("marketRadar.heroToReview", { defaultValue: "To review" })}
                   value={allOpportunities.length ? String(newCount) : "—"}
                   accent={newCount > 0 ? "text-amber-300" : undefined}
                   hint={t("marketRadar.heroToReviewHint", { defaultValue: "New opportunities you have not saved, ignored or acted on yet." })}
                   onClick={newCount > 0 ? () => { setTab("radar"); setActiveState("new"); } : undefined}
                 />
              </div>
              <div className="flex flex-col items-stretch gap-1 sm:items-end">
                <Button type="button" variant="primaryBlue" className={rankingIsStale ? "shrink-0 ring-2 ring-amber-300/70 ring-offset-2 ring-offset-[#17263f]" : "shrink-0"} onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
                  <RefreshCw className={refreshMutation.isPending ? "size-4 animate-spin" : "size-4"} />
                   {refreshMutation.isPending ? t("marketRadar.refreshing") : t("marketRadar.refresh")}
                 </Button>
                 {rankingIsStale && lastEvaluatedAt ? (
                   <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-amber-300">
                     <span className="size-1.5 rounded-full bg-amber-300" />
                     {t("marketRadar.newDataAvailable", { defaultValue: "New market data · ranked {{value}}", value: timeAgo(lastEvaluatedAt, locale) })}
                   </p>
                 ) : lastEvaluatedAt && (
                   <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400"><Clock className="size-3" />{t("marketRadar.updated", { value: timeAgo(lastEvaluatedAt, locale) })}</p>
                 )}
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

        {tab === "profile" && (        <Card className="gap-0 border-slate-200 bg-white py-0 shadow-sm">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><SlidersHorizontal className="size-4" /></span>
              <div>
                 <h2 className="font-semibold text-slate-900">{t("marketRadar.sellerProfile")}</h2>
                 <p className="text-sm text-slate-500">{t("marketRadar.sellerProfileDescription")}</p>
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
              <div className="flex min-h-40 items-center justify-center text-sm text-slate-500" role="status">
                 {t("marketRadar.loadingProfile", { defaultValue: "Loading your saved seller profile..." })}
              </div>
            ) : (
              <form className="grid gap-5 border-t border-slate-100 p-5 lg:grid-cols-2" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(profile); }}>
                <div className="flex flex-wrap items-center justify-between gap-2 lg:col-span-2">
                  <p className="text-xs text-slate-500">{t("marketRadar.profilePresetHint", { defaultValue: "Match the profile to the apparel dataset to improve relevance and seller fit." })}</p>
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

        {tab === "profile" && hasProfile && !profileOpen && (
          <ProfileImpactCard profile={profile} opportunities={allOpportunities} onAddKeyword={addKeyword} adding={addingKeyword} />
        )}

        {tab === "niche" && canLoadSellerData && !profileQuery.isPending && (
          <NicheInsightSection
            hasProfile={hasProfile}
            loading={hasProfile && marketInsightsQuery.isPending}
            error={hasProfile && marketInsightsQuery.isError}
            insights={marketInsightsQuery.data ?? []}
            selected={nicheInsight}
            onSelect={setSelectedNiche}
            minimumPrice={savedPriceRange.minimumPrice}
            maximumPrice={savedPriceRange.maximumPrice}
          />
        )}

        {tab === "competitors" && canLoadSellerData && !profileQuery.isPending && (
          <CompetitorSection
            hasProfile={hasProfile}
            loading={hasProfile && marketInsightsQuery.isPending}
            error={hasProfile && marketInsightsQuery.isError}
            insight={nicheInsight}
            insights={marketInsightsQuery.data ?? []}
            onSelect={setSelectedNiche}
            minimumPrice={savedPriceRange.minimumPrice}
            maximumPrice={savedPriceRange.maximumPrice}
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

        {allOpportunities.length > 0 && <SeasonalWindowCard opportunities={allOpportunities} titles={localizedTitles} locale={locale} />}

        {comparedOpportunities.length > 0 && (
          <ComparePanel items={comparedOpportunities} onRemove={(id) => setCompareIds((current) => current.filter((itemId) => itemId !== id))} />
        )}

        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
             <div><h2 className="text-lg font-semibold text-slate-900">{t("marketRadar.recommended")}</h2><p className="mt-1 text-sm text-slate-500">{t("marketRadar.recommendedDescription")}</p></div>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex min-w-0 flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 lg:flex-none">
                {stateFilters.map((filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    aria-pressed={activeState === filter.value}
                    onClick={() => setActiveState(filter.value)}
                    className={"flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors lg:flex-none " + (activeState === filter.value ? "bg-[#17263f] text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800")}
                  >
                    {t(`marketRadar.${filter.value}`, { defaultValue: filter.label })}
                    <span className={"rounded-full px-1.5 text-[11px] tabular-nums " + (activeState === filter.value ? "bg-white/15" : "bg-slate-100 text-slate-500")}>{stateCounts[filter.value] ?? 0}</span>
                  </button>
                ))}
              </div>
              <div className="flex shrink-0 rounded-xl border border-slate-200 bg-white p-1">
                 {([["cards", LayoutGrid, t("marketRadar.cardView")], ["list", List, t("marketRadar.listView")]] as const).map(([value, Icon, label]) => (
                  <button key={value} type="button" aria-label={label} title={label} aria-pressed={view === value} onClick={() => setView(value)} className={"rounded-lg p-1.5 transition-colors " + (view === value ? "bg-slate-100 text-slate-900" : "text-slate-400 hover:text-slate-700")}>
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          {opportunitiesQuery.isPending ? (
             <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((index) => <OpportunitySkeleton key={index} />)}</div>
          ) : opportunitiesQuery.isError ? (
             <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-700">{t("errors.loadOpportunities")}</div>
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
            <Card className="gap-0 overflow-hidden border-slate-200 bg-white py-0 shadow-sm">
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

function HeroStat({ label, value, suffix, accent, hint, onClick }: { label: string; value: string; suffix?: string; accent?: string; hint?: string; onClick?: () => void }) {
  const content = (
    <>
      <p className="text-lg font-semibold tabular-nums">
        <span className={accent ?? "text-white"}>{value}</span>
        {suffix && <span className="ml-0.5 text-xs font-medium text-slate-400">{suffix}</span>}
      </p>
      <p className="text-[9px] font-medium tracking-[0.08em] whitespace-nowrap text-slate-400 uppercase sm:text-[10px] sm:tracking-[0.12em]">{label}</p>
    </>
  );
  const className = "px-2 py-2 text-center sm:min-w-28 sm:px-4";
  const stat = onClick
    ? <button type="button" onClick={onClick} className={`${className} rounded-none transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.08] focus-visible:outline-none`}>{content}</button>
    : <div className={className}>{content}</div>;
  if (!hint) return stat;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{stat}</TooltipTrigger>
      <TooltipContent className="max-w-56 text-center">{hint}</TooltipContent>
    </Tooltip>
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
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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
        <span className="min-w-20 text-center text-xs font-medium text-slate-600">
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
          <p className="flex items-center gap-2 text-xs font-bold tracking-[0.12em] text-blue-700 uppercase"><BarChart3 className="size-3.5" />{t("marketRadar.marketSignals", { defaultValue: "Market signals for your profile" })}</p>
          <p className="mt-1 text-sm text-slate-500">{t("marketRadar.marketSignalsDescription", { defaultValue: "Keyword-level insights from the shared public Etsy dataset, matched to your seller profile." })}</p>
        </div>
      </div>
      {!hasProfile ? (
        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-6 text-sm text-blue-800">
          {t("marketRadar.marketSignalsSetup", { defaultValue: "Save your seller profile above to match public Etsy market signals to your niche." })}
        </div>
      ) : loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500" role="status">
          {t("marketRadar.marketSignalsLoading", { defaultValue: "Loading public Etsy market signals..." })}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {t("marketRadar.marketSignalsError", { defaultValue: "Market signals could not be loaded. Try refreshing the radar." })}
        </div>
      ) : insights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          <p>{t("marketRadar.noMatchingSignals", { defaultValue: "No collected market signals match this seller profile yet." })}</p>
          <p className="mt-2 text-xs text-slate-400">{t("marketRadar.noMatchingSignalsHint", { defaultValue: "These signals come from public Etsy snapshots collected by the admin Market Insights job." })}</p>
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
              <Card key={insight.query} className="gap-0 overflow-hidden border-slate-200 bg-white py-0 shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">{t("marketRadar.keywordSignal", { defaultValue: "Keyword signal" })}</p>
                    <h3 className="mt-1 truncate text-base font-semibold text-slate-900 capitalize" title={insight.query}>{insight.query}</h3>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">{formatInsightType(insight.insightType)}</span>
                </div>
                <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 text-xs font-semibold text-slate-600 marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">{t("marketRadar.viewSignals", { defaultValue: "View market signals" })}</span>
                  <span className="hidden group-open:inline">{t("marketRadar.collapse")}</span>
                  <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="border-b border-blue-100 bg-blue-50/50 px-5 py-4">
                  <p className="text-[10px] font-bold tracking-[0.12em] text-blue-700 uppercase">{t("marketRadar.actionableInsight", { defaultValue: "Actionable insight" })}</p>
                  <p className="mt-1 text-sm leading-6 font-semibold text-slate-900">{insight.recommendation}</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">{t("marketRadar.actionPlan", { defaultValue: "Action plan" })}</p>
                      <ol className="mt-2 space-y-1.5 text-xs leading-5 text-slate-700">
                        {insight.actionPlan.slice(0, 3).map((step, index) => <li key={step}><span className="mr-1.5 font-semibold text-blue-700">{index + 1}.</span>{step}</li>)}
                      </ol>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">{t("marketRadar.risks", { defaultValue: "Risk" })}</p>
                      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-slate-600">
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
                  <div className="border-t border-slate-100 px-5 py-3">
                    <p className="text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">{t("marketRadar.topTags", { defaultValue: "Top tags" })}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {insight.topTags.slice(0, 6).map((tag) => (
                        <span key={tag.tag} className="rounded-full bg-slate-50 px-2 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200">{tag.tag} · {tag.listingCount}</span>
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
  selected,
  onSelect,
  minimumPrice,
  maximumPrice,
}: {
  hasProfile: boolean;
  loading: boolean;
  error: boolean;
  insights: SellerNicheMarketInsight[];
  selected: SellerNicheMarketInsight | undefined;
  onSelect: (niche: string) => void;
  minimumPrice: number | null;
  maximumPrice: number | null;
}) {
  const { t } = useTranslation("common");

  return (
    <section className="space-y-3">
      {!hasProfile ? (
        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-6 text-sm text-blue-800">{t("marketRadar.marketSignalsSetup", { defaultValue: "Save your seller profile above to match public Etsy market signals to your niche." })}</div>
      ) : loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500" role="status">{t("marketRadar.marketSignalsLoading", { defaultValue: "Calculating your niche conclusion from public Etsy data..." })}</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{t("marketRadar.marketSignalsError", { defaultValue: "The niche conclusion could not be loaded. Try refreshing the radar." })}</div>
      ) : insights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          <p>{t("marketRadar.noMatchingSignals", { defaultValue: "No market group matches this seller profile yet." })}</p>
          <p className="mt-2 text-xs text-slate-400">{t("marketRadar.noMatchingSignalsHint", { defaultValue: "Run the admin Market Insights collection with keywords close to this niche." })}</p>
        </div>
      ) : (
        <>
          <NicheMapCard insights={insights} selected={selected?.niche ?? null} onSelect={onSelect} />
          {selected && <NicheConclusionCard key={selected.niche} insight={selected} minimumPrice={minimumPrice} maximumPrice={maximumPrice} />}
        </>
      )}
    </section>
  );
}

function NicheConclusionCard({ insight: source, minimumPrice, maximumPrice }: { insight: SellerNicheMarketInsight; minimumPrice: number | null; maximumPrice: number | null }) {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.resolvedLanguage?.toLowerCase().startsWith("vi") ? "vi" : "en";
  const insight = useLocalizedNiche(source, locale);
  const [showWhy, setShowWhy] = useState(false);
  const { marketSupply, signals } = insight;
  const unavailable = t("marketRadar.notEnoughData", { defaultValue: "Not enough data" });
  const verdictStyle = insight.verdict === "worth_following"
    ? { badge: "bg-emerald-600 text-white", panel: "border-emerald-200 bg-emerald-50/70", icon: Check }
    : insight.verdict === "avoid_for_now"
      ? { badge: "bg-rose-600 text-white", panel: "border-rose-200 bg-rose-50/70", icon: X }
      : insight.verdict === "insufficient_evidence"
        ? { badge: "bg-slate-600 text-white", panel: "border-slate-200 bg-slate-50", icon: CircleHelp }
        : { badge: "bg-amber-500 text-white", panel: "border-amber-200 bg-amber-50/70", icon: Target };
  const VerdictIcon = verdictStyle.icon;
  const observedDays = Math.max(insight.observationPeriodCount, marketSupply.observationDayCount);
  const strongShare = signals.sellerCount > 0 ? Math.round((signals.strongSellerCount / signals.sellerCount) * 100) : null;
  const topShare = signals.topSellerSharePercent;
  // How much of the top results the five largest shops hold: low means no shop owns the niche.
  const concentration = topShare == null
    ? null
    : topShare <= 10
      ? { label: t("marketRadar.concentrationLow", { defaultValue: "No shop dominates" }), tone: "good" as const }
      : topShare <= 30
        ? { label: t("marketRadar.concentrationMedium", { defaultValue: "Partly concentrated" }), tone: undefined }
        : { label: t("marketRadar.concentrationHigh", { defaultValue: "A few shops dominate" }), tone: "warn" as const };
  const headline = firstSentence(insight.conclusion) ?? insight.recommendation;
  const nextStep = insight.actionPlan[0] ?? (headline === insight.recommendation ? null : insight.recommendation);
  // Share of top listings that buyers favorite at all: in many niches most listings get none.
  const activeShare = signals.points.length === 0
    ? null
    : Math.round((signals.points.filter((point) => point.favoritesPer30Days >= 1).length / signals.points.length) * 100);
  const demand = {
    high: { label: t("marketRadar.demandHigh", { defaultValue: "High demand" }), tone: "good" as const },
    medium: { label: t("marketRadar.demandMedium", { defaultValue: "Moderate demand" }), tone: undefined },
    low: { label: t("marketRadar.demandLow", { defaultValue: "Low demand" }), tone: "warn" as const },
    insufficient: { label: t("marketRadar.demandUnknown", { defaultValue: "Not enough data" }), tone: undefined },
  }[insight.demandProxy];

  return (
    <Card className="gap-0 overflow-hidden border-slate-200 bg-white py-0 shadow-sm">
      <div className="flex flex-col gap-3 px-5 pt-5 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 capitalize">{insight.niche}</h3>
          <p className="mt-0.5 text-sm text-slate-500">
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

      {/* The verdict leads: what it means and the strongest reasons, before any figure. */}
      <div className={`mx-5 mb-4 rounded-xl border px-4 py-3 ${verdictStyle.panel}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
          <span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg px-3 py-1.5 text-sm font-bold capitalize ${verdictStyle.badge}`}>
            <VerdictIcon className="size-4" aria-hidden="true" />
            {formatVerdict(insight.verdict)}
          </span>
          <p className="min-w-0 pt-1 text-sm leading-6 font-medium text-slate-800">{headline}</p>
        </div>
        {nextStep && (
          <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-700">
            <Zap className="mt-1 size-4 shrink-0 text-blue-600" aria-hidden="true" />
            <span><span className="font-semibold text-slate-900">{t("marketRadar.nextStepLabel", { defaultValue: "Next step:" })}</span> {nextStep}</span>
          </p>
        )}
        {(insight.highlights.length > 0 || insight.risks.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {insight.highlights.slice(0, 2).map((item) => (
              <span key={item} title={item} className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-emerald-800 ring-1 ring-emerald-200">
                <Check className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{item}</span>
              </span>
            ))}
            {insight.risks.slice(0, 2).map((item) => (
              <span key={item} title={item} className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-amber-800 ring-1 ring-amber-200">
                <TriangleAlert className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{item}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 px-5 pb-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label={t("marketRadar.tileMarket", { defaultValue: "Market size" })}
          value={marketSupply.activeListingCount == null ? "—" : compactNumber(marketSupply.activeListingCount)}
          badge={marketSupply.changePercent == null ? undefined : formatSigned(marketSupply.changePercent)}
          badgeTone={marketSupply.trend === "growing" ? "down" : marketSupply.trend === "reducing" ? "up" : undefined}
          caption={t("marketRadar.tileMarketCaption", { defaultValue: "Active listings on Etsy" })}
          info={t("marketRadar.tileMarketInfo", { defaultValue: "Etsy's own count of active listings for this niche's keywords. The badge is how that count moved across the collected days; more listings means more supply to compete with. The rank compares it with the other tracked niches." })}
          progress={marketSupply.sizePercentile}
          chart={marketSupply.history && marketSupply.history.length >= 2 ? <SupplySparkline history={marketSupply.history} /> : undefined}
          footerLeft={marketSizeShort(marketSupply.sizePercentile, t)}
          footerRight={marketSupply.sizePercentile == null ? unavailable : t("marketRadar.sizeRankShort", { defaultValue: "{{value}}/100 vs niches", value: Math.round(marketSupply.sizePercentile) })}
        />
        <MetricTile
          label={t("marketRadar.tileStrongSellers", { defaultValue: "Strong competitors" })}
          value={signals.sellerCount > 0 ? `${signals.strongSellerCount} / ${signals.sellerCount}` : "—"}
          badge={strongShare == null ? undefined : t("marketRadar.strongShareBadge", { defaultValue: "{{value}}% strong", value: strongShare })}
          badgeTone={strongShare != null && strongShare <= 10 ? "up" : undefined}
          caption={t("marketRadar.tileStrongSellersShort", { defaultValue: "strong shops / shops at the top" })}
          info={t("marketRadar.tileStrongSellersInfo", { defaultValue: "A strong shop has a top listing gaining 3+ favorites a month. Top 5 is the share of the top listings held by the five largest shops: the lower it is, the less any shop owns the niche." })}
          progress={strongShare}
          chart={signals.sellerCount > 0 ? <StrongSellerBar strong={signals.strongSellerCount} total={signals.sellerCount} /> : undefined}
          footerLeft={concentration?.label ?? unavailable}
          footerRight={topShare == null ? "" : t("marketRadar.topFiveBadge", { defaultValue: "Top 5: {{value}}%", value: topShare })}
          footerTone={concentration?.tone}
        />
        <MetricTile
          label={t("marketRadar.tileRising", { defaultValue: "New listings already in the top" })}
          // A count, not a change: no sign, so it does not read like the supply trend.
          value={String(signals.risingNewListingCount)}
          badge={signals.risingNewListingCount > 0 ? t("marketRadar.breakout", { defaultValue: "Open to newcomers" }) : undefined}
          badgeTone="up"
          caption={t("marketRadar.tileRisingShort", { defaultValue: "new listings already winning" })}
          info={t("marketRadar.tileRisingInfo", { defaultValue: "Top listings under 90 days old that already gain 3+ favorites a month. Above zero means a newcomer can still reach the top here." })}
          progress={signals.newListingSharePercent}
          footerLeft={t("marketRadar.listingsUnder30", { defaultValue: "Top listings under 30 days old" })}
          footerRight={signals.newListingSharePercent == null ? unavailable : `${signals.newListingSharePercent}%`}
          footerTone={signals.risingNewListingCount > 0 ? "good" : undefined}
        />
        <MetricTile
          label={t("marketRadar.tileDemand", { defaultValue: "Buyer interest" })}
          value={signals.medianFavoritesPer30Days == null ? "—" : String(Math.round(signals.medianFavoritesPer30Days * 10) / 10)}
          badge={demand.label}
          badgeTone={demand.tone === "good" ? "up" : demand.tone === "warn" ? "down" : undefined}
          caption={t("marketRadar.tileDemandShort", { defaultValue: "favorites per top listing a month (median)" })}
          info={t("marketRadar.tileDemandInfo", { defaultValue: "Favorites are the public interest signal Etsy shares; sales are not public. The bar is the share of top listings that get at least one favorite a month." })}
          progress={activeShare}
          footerLeft={t("marketRadar.activeListings", { defaultValue: "Top listings with favorites" })}
          footerRight={activeShare == null ? unavailable : `${activeShare}%`}
          footerTone={activeShare == null ? undefined : activeShare >= 50 ? "good" : activeShare < 25 ? "warn" : undefined}
        />
      </div>

      <PriceSweetSpot
        points={signals.points}
        currency={signals.priceCurrency}
        minimumPrice={minimumPrice}
        maximumPrice={maximumPrice}
        p25={signals.priceP25}
        p75={signals.priceP75}
        details={signals.points.length > 0 ? (
        <>
          <p className="text-xs text-slate-500">{t("marketRadar.scatterSubtitleShort", { defaultValue: "Each dot is a top listing: right is pricier, up gets more favorites. Orange dots are under 90 days old." })}</p>
          <PriceInterestScatter points={signals.points} p25={signals.priceP25} p75={signals.priceP75} currency={signals.priceCurrency} />
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-semibold text-slate-500">{t("marketRadar.showAsTable", { defaultValue: "Show as table" })}</summary>
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-100">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-[10px] tracking-[0.08em] text-slate-400 uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">{t("marketRadar.listing", { defaultValue: "Listing" })}</th>
                    <th className="px-3 py-2 font-semibold">{t("marketRadar.listPrice", { defaultValue: "List price" })}</th>
                    <th className="px-3 py-2 font-semibold">{t("marketRadar.favoritesPerMonth", { defaultValue: "Favorites / month" })}</th>
                    <th className="px-3 py-2 font-semibold">{t("marketRadar.age", { defaultValue: "Age" })}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...signals.points].sort((a, b) => b.favoritesPer30Days - a.favoritesPer30Days).map((point) => (
                    <tr key={`${point.title}-${point.price}-${point.ageDays}`}>
                      <td className="max-w-64 truncate px-3 py-1.5" title={point.title}>
                        {point.url
                          ? <a className="text-blue-700 hover:underline" href={point.url} target="_blank" rel="noreferrer">{point.title}</a>
                          : <span className="text-slate-700">{point.title}</span>}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600 tabular-nums">{formatMoney(point.price)}</td>
                      <td className="px-3 py-1.5 font-semibold text-slate-800 tabular-nums">{point.favoritesPer30Days}</td>
                      <td className="px-3 py-1.5 text-slate-600 tabular-nums">{t("marketRadar.daysShort", { defaultValue: "{{value}} d", value: point.ageDays })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
        ) : undefined}
      />

      {showWhy && (
        <div className="space-y-5 border-t border-slate-100 px-5 py-5">
          <p className="text-sm leading-6 text-slate-600">{insight.conclusion}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReasonPanel tone="good" title={t("marketRadar.whyTitle", { defaultValue: "What the data shows" })} items={insight.highlights} empty={unavailable} />
            <ReasonPanel tone="warn" title={t("marketRadar.watchOutTitle", { defaultValue: "Watch out" })} items={insight.risks} empty={unavailable} />
          </div>
          {insight.keywords.length > 0 && (
            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">{t("marketRadar.compareKeywords", { defaultValue: "Compare keywords" })}</p>
              <div className="mt-2 overflow-x-auto rounded-lg border border-slate-100">
                <table className="w-full min-w-[32rem] text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] tracking-[0.08em] text-slate-400 uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">{t("marketRadar.keyword", { defaultValue: "Keyword" })}</th>
                      <th className="px-3 py-2 font-semibold">{t("marketRadar.tileMarket", { defaultValue: "Market size" })}</th>
                      <th className="px-3 py-2 font-semibold">{t("marketRadar.tileStrongSellers", { defaultValue: "Strong competitors" })}</th>
                      <th className="px-3 py-2 font-semibold">{t("marketRadar.tileRising", { defaultValue: "New listings rising" })}</th>
                      <th className="px-3 py-2 font-semibold">{t("marketRadar.keywordScore", { defaultValue: "Score" })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {insight.keywords.map((keyword) => (
                      <tr key={keyword.keyword} className="hover:bg-slate-50/80">
                        <td className="max-w-48 truncate px-3 py-2.5 font-medium text-slate-800" title={keyword.keyword}>{keyword.keyword}</td>
                        <td className="px-3 py-2.5"><SizeBar percentile={keyword.sizePercentile} count={keyword.activeListingCount} level={keyword.competitionLevel} /></td>
                        <td className="px-3 py-2.5 text-slate-700 tabular-nums">{keyword.signals.sellerCount > 0 ? `${keyword.signals.strongSellerCount} / ${keyword.signals.sellerCount}` : "—"}</td>
                        <td className={`px-3 py-2.5 font-semibold tabular-nums ${keyword.signals.risingNewListingCount > 0 ? "text-emerald-700" : "text-slate-400"}`}>{keyword.signals.risingNewListingCount}</td>
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
  note,
  info,
}: {
  label: string;
  value: string;
  badge?: string;
  badgeTone?: "up" | "down";
  /** One short line under the value; anything longer belongs in <c>info</c>. */
  caption?: string;
  /** How the figure is measured, shown behind an info icon next to the label. */
  info?: string;
  progress: number | null;
  chart?: ReactNode;
  footerLeft: string;
  footerRight: string;
  /** What the footer figure means for a seller entering the niche; neutral when it is only context. */
  footerTone?: "good" | "warn";
  /** A caution shown under the tile, for a figure that is easy to misread. */
  note?: string;
}) {
  const badgeClass = badgeTone === "up" ? "text-emerald-700" : badgeTone === "down" ? "text-rose-700" : "text-slate-500";
  const footerClass = footerTone === "good"
    ? "rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800"
    : footerTone === "warn"
      ? "rounded-full bg-amber-100 px-2 py-0.5 text-amber-800"
      : "text-slate-700";
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4">
      <p className="flex items-center gap-1 text-xs font-semibold text-slate-500">{label}{info && <InfoTip text={info} label={label} />}</p>
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
          {badge && <span className={`shrink-0 text-[11px] font-bold ${badgeClass}`}>{badge}</span>}
        </div>
        {caption && <p className="mt-0.5 text-xs text-slate-500">{caption}</p>}
      </div>
      {chart ?? (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(Math.max(progress ?? 0, 0), 100)}%` }} />
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-slate-500">{footerLeft}</span>
        <span className={`shrink-0 font-bold ${footerClass}`}>{footerRight}</span>
      </div>
      {note && (
        <p className="flex items-start gap-1.5 border-t border-slate-200 pt-2 text-[11px] leading-4 text-amber-700">
          <TriangleAlert className="mt-px size-3 shrink-0" aria-hidden="true" />
          <span>{note}</span>
        </p>
      )}
    </div>
  );
}

function ReasonPanel({ title, items, empty, tone }: { title: string; items: string[]; empty: string; tone: "good" | "warn" }) {
  const Icon = tone === "good" ? Check : TriangleAlert;
  const color = tone === "good" ? "text-emerald-700" : "text-amber-700";
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className={`flex items-center gap-1.5 text-sm font-bold ${color}`}><Icon className="size-4" />{title}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-sm leading-5 text-slate-700">
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
  if (count == null) return <span className="text-slate-400">—</span>;
  const color = level === "low" ? "bg-emerald-500" : level === "medium" ? "bg-amber-500" : level === "high" ? "bg-rose-500" : "bg-slate-300";
  return (
    <div className="flex min-w-32 items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.max(8, percentile ?? 0)}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums">{compactNumber(count)}</span>
    </div>
  );
}

function marketSizeShort(percentile: number | null, t: TFunction) {
  if (percentile == null) return t("marketRadar.sizeUnranked", { defaultValue: "Not ranked yet" });
  if (percentile > 200 / 3) return t("marketRadar.sizeLarge", { defaultValue: "Large market" });
  if (percentile > 100 / 3) return t("marketRadar.sizeMedium", { defaultValue: "Mid-size market" });
  return t("marketRadar.sizeSmall", { defaultValue: "Small market" });
}

/** The first sentence of a generated paragraph, for a one-line headline; the full text stays in the breakdown. */
function firstSentence(text: string | null | undefined) {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  return trimmed.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? trimmed;
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
    <div className="sticky top-0 z-20 -mx-4 bg-slate-50/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">
        {tabs.map(({ value, label, badge, icon: Icon }) => {
          const selected = active === value;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(value)}
              className={"flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-all sm:px-4 " + (selected ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-500 hover:bg-white/60 hover:text-slate-800")}
            >
              <Icon className={"size-4 " + (selected ? "text-blue-600" : "")} />
              {label}
              {badge && <span className={"rounded-full px-2 py-0.5 text-[11px] font-semibold " + (selected ? "bg-blue-600 text-white" : "bg-white text-slate-600")}>{badge}</span>}
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
  insights,
  onSelect,
  minimumPrice,
  maximumPrice,
}: {
  hasProfile: boolean;
  loading: boolean;
  error: boolean;
  insight: SellerNicheMarketInsight | undefined;
  insights: SellerNicheMarketInsight[];
  onSelect: (niche: string) => void;
  minimumPrice: number | null;
  maximumPrice: number | null;
}) {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.resolvedLanguage?.toLowerCase().startsWith("vi") ? "vi" : "en";

  if (!hasProfile) {
    return <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/60 p-6 text-sm text-blue-800">{t("marketRadar.marketSignalsSetup", { defaultValue: "Save your seller profile to match public Etsy market signals to your niche." })}</div>;
  }
  if (loading) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500" role="status">{t("marketRadar.marketSignalsLoading", { defaultValue: "Calculating your niche from public Etsy data..." })}</div>;
  }
  if (error || !source) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{t("marketRadar.noMatchingSignals", { defaultValue: "No market group matches this seller profile yet." })}</div>;
  }
  return (
    <CompetitorPanel
      key={source.niche}
      insight={source}
      locale={locale}
      insights={insights}
      onSelect={onSelect}
      minimumPrice={minimumPrice}
      maximumPrice={maximumPrice}
    />
  );
}

function CompetitorPanel({
  insight: source,
  locale,
  insights,
  onSelect,
  minimumPrice,
  maximumPrice,
}: {
  insight: SellerNicheMarketInsight;
  locale: string;
  insights: SellerNicheMarketInsight[];
  onSelect: (niche: string) => void;
  minimumPrice: number | null;
  maximumPrice: number | null;
}) {
  const { t } = useTranslation("common");
  const insight = useLocalizedNiche(source, locale);
  const { signals } = insight;
  const unavailable = t("marketRadar.notEnoughData", { defaultValue: "Not enough data" });
  const topShare = signals.topSellerSharePercent;
  const ageMonths = signals.medianListingAgeDays == null ? null : Math.round((signals.medianListingAgeDays / 30) * 10) / 10;
  // Listings under 3 months old that already made the top: a high share means newcomers can break in.
  const freshShare = signals.points.length === 0 ? null : Math.round((signals.points.filter((point) => point.ageDays < 90).length / signals.points.length) * 100);
  // competitorTrend is the trend of Etsy's active-listing count for the niche (the market supply), not a
  // count of shops. More listings is worse for a newcomer, so growth reads as a warning and decline as good news.
  // It is labelled in full in the footer: as a bare "Listings +0%" badge it read like the new-listing count.
  const supplyChange = insight.competitorGrowthPercent;
  const supplyDays = insight.marketSupply.observationDayCount;
  const supplyDirection = insight.competitorTrend === "growing"
    ? { label: t("marketRadar.supplyGrowing", { defaultValue: "growing" }), tone: "warn" as const }
    : insight.competitorTrend === "reducing"
      ? { label: t("marketRadar.supplyReducing", { defaultValue: "shrinking" }), tone: "good" as const }
      : insight.competitorTrend === "stable"
        ? { label: t("marketRadar.supplyStable", { defaultValue: "steady" }), tone: undefined }
        : null;

  return (
    <Card className="gap-0 overflow-hidden border-slate-200 bg-white py-0 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{t("marketRadar.competitorTitle", { defaultValue: "Who you compete with" })}</h3>
            {signals.sellerCount > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">{t("marketRadar.shopsAtTop", { defaultValue: "{{count}} shops at the top", count: signals.sellerCount })}</span>
            )}
          </div>
          <p className="text-sm text-slate-500 capitalize">{insight.niche}</p>
        </div>
        <NicheSelect insights={insights} selected={source.niche} onSelect={onSelect} />
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
          footerTone={topShare != null && topShare < 25 ? "good" : undefined}
        />
        <MetricTile
          label={t("marketRadar.competitorMomentum", { defaultValue: "Shops at the top" })}
          value={signals.sellerCount > 0 ? `${signals.strongSellerCount} / ${signals.sellerCount}` : "—"}
          caption={t("marketRadar.competitorMomentumCaption", { defaultValue: "Strong shops / all shops in the top sample. A strong shop has a top listing gaining 3+ favorites a month." })}
          progress={null}
          chart={signals.sellerCount > 0 ? (
            <div className="space-y-3">
              <StrongSellerBar strong={signals.strongSellerCount} total={signals.sellerCount} />
              <MiniStats
                items={[
                  { label: t("marketRadar.miniStrongShops", { defaultValue: "Strong shops" }), value: String(signals.strongSellerCount) },
                  { label: t("marketRadar.miniOtherShops", { defaultValue: "Other shops" }), value: String(signals.sellerCount - signals.strongSellerCount) },
                  {
                    label: t("marketRadar.miniRisingNew", { defaultValue: "New listings already in the top" }),
                    hint: t("marketRadar.miniRisingNewHint", { defaultValue: "under 90 days old, 3+ favorites a month" }),
                    value: String(signals.risingNewListingCount),
                    tone: signals.risingNewListingCount > 0 ? "good" : undefined,
                  },
                  {
                    label: t("marketRadar.miniMedianFavorites", { defaultValue: "Favorites per listing" }),
                    hint: t("marketRadar.miniMedianFavoritesHint", { defaultValue: "a month, median of the top" }),
                    value: signals.medianFavoritesPer30Days == null ? "—" : String(Math.round(signals.medianFavoritesPer30Days * 10) / 10),
                  },
                ]}
              />
            </div>
          ) : undefined}
          footerLeft={supplyDays > 0
            ? t("marketRadar.etsyListingsOverDays", { defaultValue: "All Etsy listings, last {{count}} days", count: supplyDays })
            : t("marketRadar.etsyListings", { defaultValue: "All Etsy listings" })}
          footerRight={supplyDirection == null || supplyChange == null
            ? t("marketRadar.competitorsUnknown", { defaultValue: "Needs more days of data" })
            : `${formatSigned(supplyChange)} · ${supplyDirection.label}`}
          footerTone={supplyDirection?.tone}
        />
        <MetricTile
          label={t("marketRadar.listingAge", { defaultValue: "Typical listing age" })}
          value={ageMonths == null ? "—" : t("marketRadar.months", { defaultValue: "{{value}} mo", value: ageMonths })}
          caption={t("marketRadar.listingAgeCaption", { defaultValue: "Median age of the top listings" })}
          progress={ageMonths == null ? null : Math.min(100, (ageMonths / 24) * 100)}
          chart={signals.points.length > 0 ? <ListingAgeBars points={signals.points} /> : undefined}
          footerLeft={ageMonths == null ? unavailable : ageMonths <= 6 ? t("marketRadar.freshTop", { defaultValue: "Fresh" }) : t("marketRadar.establishedTop", { defaultValue: "Established" })}
          footerRight={freshShare == null ? "" : t("marketRadar.freshShare", { defaultValue: "{{value}}% under 3 mo", value: freshShare })}
          footerTone={freshShare != null && freshShare >= 20 ? "good" : undefined}
        />
      </div>

      {signals.risingListings.length > 0 && (
        <div className="border-t border-slate-100 px-5 py-4">
          <p className="text-sm font-semibold text-slate-900">{t("marketRadar.listingsToLearnFrom", { defaultValue: "New listings to learn from" })}</p>
          <p className="text-xs text-slate-500">{t("marketRadar.listingsToLearnFromDescription", { defaultValue: "Under 90 days old and already gaining favorites. Study them; do not copy them." })}</p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-100">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] tracking-[0.08em] text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.listing", { defaultValue: "Listing" })}</th>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.age", { defaultValue: "Age" })}</th>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.favoritesPerMonth", { defaultValue: "Favorites / month" })}</th>
                  <th className="px-3 py-2 font-semibold">{t("marketRadar.listPrice", { defaultValue: "List price" })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {signals.risingListings.map((listing) => (
                  <tr key={`${listing.title}-${listing.url}`} className="hover:bg-slate-50/80">
                    <td className="max-w-72 truncate px-3 py-2.5">
                      {listing.url
                        ? <a className="text-blue-700 hover:underline" href={listing.url} target="_blank" rel="noreferrer" title={listing.title}>{listing.title}</a>
                        : <span title={listing.title}>{listing.title}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 tabular-nums">{t("marketRadar.daysShort", { defaultValue: "{{value}} d", value: listing.ageDays })}</td>
                    <td className="px-3 py-2.5 font-semibold text-emerald-700 tabular-nums">{listing.favoritesPer30Days}</td>
                    <td className="px-3 py-2.5 text-slate-600 tabular-nums">{listing.price == null ? "—" : `${formatMoney(listing.price)} ${listing.currency ?? ""}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CompetitorLeaderboard competitors={insight.competitors} sampleListingCount={signals.sampleListingCount} currency={signals.priceCurrency} />

      <CompetitorPriceStrip
        competitors={insight.competitors}
        p25={signals.priceP25}
        p75={signals.priceP75}
        currency={signals.priceCurrency}
        minimumPrice={minimumPrice}
        maximumPrice={maximumPrice}
      />

      <p className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
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
      <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-400 uppercase">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        {known && <LevelMeter level={level} />}
        <span className="truncate text-sm font-semibold text-slate-800 capitalize">{known ? level : unavailable}</span>
      </div>
      <p className="truncate text-[11px] text-slate-500">{detail}</p>
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
    <Card className="gap-0 overflow-hidden border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white py-0 shadow-sm">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] text-blue-700 uppercase"><Target className="size-3.5" />{t("marketRadar.todayRadar")}</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-blue-100">{t("marketRadar.topOpportunity")}</span>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white">#{topOpportunity.rank ?? 1}</span>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-slate-900">{topOpportunity.title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-600">{topOpportunity.fitExplanation ?? t("marketRadar.strongestMatch", { defaultValue: "Strongest current match for your seller profile." })}</p>
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><ArrowRight className="mt-0.5 size-3.5 shrink-0 text-blue-600" />{nextAction}</p>
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
      <details className="group border-t border-blue-100">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-xs font-semibold text-slate-600 marker:hidden [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">{t("marketRadar.viewTopDetails", { defaultValue: "View top opportunity details" })}</span>
          <span className="hidden group-open:inline">{t("marketRadar.collapse")}</span>
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        </summary>
      <div className="grid gap-3 border-t border-blue-100 px-5 py-4 sm:grid-cols-2 lg:grid-cols-7">
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
    <div className="rounded-xl border border-blue-100 bg-white/80 px-3 py-2.5">
      <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-400 uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

type CompareRow = {
  key: string;
  label: string;
  hint: string;
  value: (item: SellerOpportunity) => string;
  detail?: (item: SellerOpportunity) => string | null;
  /** A comparable number; the highest (or lowest, see lowerIsBetter) wins the row. Null when the item has no figure. */
  score?: (item: SellerOpportunity) => number | null;
  lowerIsBetter?: boolean;
};

const competitionRank: Record<string, number | null> = { low: 3, medium: 2, high: 1, unknown: null };

/** Share of the shops at the top that already gain traction; lower leaves more room for a new shop. */
function strongShopShare(item: SellerOpportunity) {
  const niche = item.nicheMarket;
  return niche && niche.sellerCount > 0 ? niche.strongSellerCount / niche.sellerCount : null;
}

function itemCurrency(item: SellerOpportunity) {
  return item.insights.evidence.find((evidence) => evidence.currency)?.currency ?? null;
}

/** The ids that win a row, or none when fewer than two items have a figure or they all tie. */
function rowWinners(row: CompareRow, items: SellerOpportunity[]) {
  if (!row.score) return new Set<string>();
  const scored = items
    .map((item) => ({ id: item.id, value: row.score!(item) }))
    .filter((entry): entry is { id: string; value: number } => entry.value != null && Number.isFinite(entry.value));
  if (scored.length < 2) return new Set<string>();
  const best = row.lowerIsBetter ? Math.min(...scored.map((entry) => entry.value)) : Math.max(...scored.map((entry) => entry.value));
  const winners = scored.filter((entry) => entry.value === best);
  return winners.length === scored.length ? new Set<string>() : new Set(winners.map((entry) => entry.id));
}

function ComparePanel({ items, onRemove }: { items: SellerOpportunity[]; onRemove: (id: string) => void }) {
  const { t } = useTranslation("common");
  const level = (value: string | undefined) =>
    value ? t(`marketRadar.level.${value}`, { defaultValue: value.charAt(0).toUpperCase() + value.slice(1) }) : "—";
  const currencies = new Set(items.map(itemCurrency).filter(Boolean));
  const mixedCurrencies = currencies.size > 1;

  const rows: CompareRow[] = [
    {
      key: "overall",
      label: t("marketRadar.compareOverall", { defaultValue: "Overall score" }),
      hint: t("marketRadar.compareOverallHint", { defaultValue: "60% listing heat, 40% fit with your shop" }),
      value: (item) => `${Math.round(item.finalScore)}/100`,
      score: (item) => Math.round(item.finalScore),
    },
    {
      key: "heat",
      label: t("marketRadar.compareHeat", { defaultValue: "Listing heat" }),
      hint: t("marketRadar.compareHeatHint", { defaultValue: "How fast this listing gains favorites and views" }),
      value: (item) => `${Math.round(item.marketOpportunityScore)}/100`,
      score: (item) => Math.round(item.marketOpportunityScore),
    },
    {
      key: "fit",
      label: t("marketRadar.compareFit", { defaultValue: "Fit with your shop" }),
      hint: t("marketRadar.compareFitHint", { defaultValue: "Category, keywords and price against your profile" }),
      value: (item) => `${Math.round(item.sellerFitScore)}/100`,
      detail: (item) => {
        const b = item.fitBreakdown;
        return b.categoryFit == null ? null : t("marketRadar.compareFitDetail", {
          defaultValue: "Category {{category}} · Keywords {{keywords}} · Price {{price}}",
          category: Math.round(b.categoryFit), keywords: Math.round(b.keywordFit ?? 0), price: Math.round(b.priceFit ?? 0),
        });
      },
      score: (item) => Math.round(item.sellerFitScore),
    },
    {
      key: "competition",
      label: t("marketRadar.competition", { defaultValue: "Competition" }),
      hint: t("marketRadar.compareCompetitionHint", { defaultValue: "Size of the niche on Etsy against the other tracked niches" }),
      value: (item) => level(item.nicheMarket?.competitionLevel),
      detail: (item) => item.nicheMarket?.activeListingCount == null ? null : t("marketRadar.compareActiveListings", {
        defaultValue: "{{count}} active listings", count: compactNumber(item.nicheMarket.activeListingCount),
      }),
      score: (item) => competitionRank[item.nicheMarket?.competitionLevel ?? "unknown"] ?? null,
    },
    {
      key: "strong",
      label: t("marketRadar.compareStrongShops", { defaultValue: "Strong shops at the top" }),
      hint: t("marketRadar.compareStrongShopsHint", { defaultValue: "Shops at the top already gaining 3+ favorites a month; fewer is easier to enter" }),
      value: (item) => item.nicheMarket && item.nicheMarket.sellerCount > 0
        ? `${item.nicheMarket.strongSellerCount} / ${item.nicheMarket.sellerCount}`
        : "—",
      detail: (item) => {
        const share = strongShopShare(item);
        return share == null ? null : `${Math.round(share * 100)}%`;
      },
      score: strongShopShare,
      lowerIsBetter: true,
    },
    {
      key: "demand",
      label: t("marketRadar.compareDemand", { defaultValue: "Buyer demand" }),
      hint: t("marketRadar.compareDemandHint", { defaultValue: "Median favorites per 30 days of the niche's top listings" }),
      value: (item) => item.nicheMarket?.medianFavoritesPer30Days == null
        ? "—"
        : t("marketRadar.compareFavoritesValue", { defaultValue: "{{value}} fav / 30 days", value: item.nicheMarket.medianFavoritesPer30Days.toFixed(1) }),
      detail: (item) => item.nicheMarket ? level(item.nicheMarket.demandProxy) : null,
      score: (item) => item.nicheMarket?.medianFavoritesPer30Days ?? null,
    },
    {
      key: "rising",
      label: t("marketRadar.compareRising", { defaultValue: "New listings gaining traction" }),
      hint: t("marketRadar.compareRisingHint", { defaultValue: "Listings under 90 days old already gaining favorites: proof newcomers can sell" }),
      value: (item) => item.nicheMarket ? String(item.nicheMarket.risingNewListingCount) : "—",
      score: (item) => item.nicheMarket?.risingNewListingCount ?? null,
    },
    {
      key: "price",
      label: t("marketRadar.typicalPrice", { defaultValue: "Typical price" }),
      hint: mixedCurrencies
        ? t("marketRadar.compareMixedCurrency", { defaultValue: "List prices in different currencies are not compared" })
        : t("marketRadar.compareListPrice", { defaultValue: "List price before discounts" }),
      value: (item) => item.insights.medianPrice == null ? "—" : `${formatMoney(item.insights.medianPrice)} ${itemCurrency(item) ?? ""}`.trim(),
    },
    {
      key: "evidence",
      label: t("marketRadar.compareEvidence", { defaultValue: "Evidence" }),
      hint: t("marketRadar.compareEvidenceHint", { defaultValue: "Listings and days of data behind the niche figures" }),
      value: (item) => {
        const listings = item.fitBreakdown.distinctListingCount;
        const days = item.fitBreakdown.observationPeriodCount;
        return listings == null ? "—" : t("marketRadar.compareEvidenceValue", {
          defaultValue: "{{listings}} listings · {{days}} day(s)", listings: Math.round(listings), days: Math.round(days ?? 0),
        });
      },
    },
  ];
  const winners = Object.fromEntries(rows.map((row) => [row.key, rowWinners(row, items)]));
  const winCount = (item: SellerOpportunity) => rows.filter((row) => winners[row.key].has(item.id)).length;
  const contested = rows.filter((row) => row.score).length;

  const leader = (key: string) => {
    const set = winners[key];
    return items.find((item) => set.has(item.id)) ?? null;
  };
  const verdicts = [
    { key: "overall", label: t("marketRadar.compareBestOverall", { defaultValue: "Test first" }), tone: "blue" as const },
    { key: "strong", label: t("marketRadar.compareEasiest", { defaultValue: "Easiest niche to enter" }), tone: "green" as const },
    { key: "demand", label: t("marketRadar.compareStrongestDemand", { defaultValue: "Strongest buyer demand" }), tone: "amber" as const },
  ].map((verdict) => ({ ...verdict, item: leader(verdict.key), row: rows.find((row) => row.key === verdict.key)! }));
  const decided = verdicts.filter((verdict) => verdict.item);
  const sweep = decided.length === verdicts.length && decided.every((verdict) => verdict.item!.id === decided[0].item!.id);

  return (
    <Card className="gap-0 overflow-hidden border-slate-200 bg-white py-0 shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2"><GitCompareArrows className="size-4 text-blue-600" /><div><h2 className="font-semibold text-slate-900">{t("marketRadar.compareTitle")}</h2><p className="text-xs text-slate-500">{t("marketRadar.compareDescription")}</p></div></div>
        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{items.length}/3</span>
      </div>

      {items.length > 1 && (
        <div className="border-b border-slate-100 bg-slate-50/70 p-4">
          {sweep ? (
            <CompareInsight
              label={t("marketRadar.compareSweep", { defaultValue: "Clear winner" })}
              title={decided[0].item!.title}
              detail={t("marketRadar.compareSweepDetail", { defaultValue: "Leads on overall score, room for new shops and buyer demand. Test it first." })}
              tone="blue"
            />
          ) : decided.length === 0 ? (
            <p className="text-xs text-slate-500">{t("marketRadar.compareNoVerdict", { defaultValue: "These opportunities are too close to call on score, competition and demand." })}</p>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {verdicts.map((verdict) => (
                <CompareInsight
                  key={verdict.key}
                  label={verdict.label}
                  title={verdict.item?.title ?? t("marketRadar.compareTie", { defaultValue: "No clear leader" })}
                  detail={verdict.item ? `${verdict.row.label}: ${verdict.row.value(verdict.item)}` : t("marketRadar.compareTieDetail", { defaultValue: "Tied, or not enough niche data" })}
                  tone={verdict.tone}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <TooltipProvider delayDuration={200}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-48" />
              {items.map((item) => <col key={item.id} />)}
            </colgroup>
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-5 py-3 align-top font-medium">{t("marketRadar.signal")}</th>
                {items.map((item) => (
                  <th key={item.id} className="px-4 py-3 align-top font-medium">
                    <div className="flex min-w-0 items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="truncate text-sm font-semibold text-slate-800">{item.title}</p>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">{item.title}</TooltipContent>
                        </Tooltip>
                        <p className="mt-0.5 truncate text-[11px] font-normal text-slate-500">
                          {item.niche}
                          {items.length > 1 && contested > 0 && ` · ${t("marketRadar.compareWins", { defaultValue: "best on {{count}} of {{total}}", count: winCount(item), total: contested })}`}
                        </p>
                      </div>
                      <button type="button" aria-label={t("marketRadar.compareRemove", { defaultValue: "Remove {{title}} from comparison", title: item.title })} className="shrink-0 text-slate-400 hover:text-slate-700" onClick={() => onRemove(item.id)}><X className="size-3.5" /></button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-slate-100">
                  <th className="px-5 py-2.5 align-top text-xs font-medium text-slate-600">
                    {row.label}
                    <p className="mt-0.5 text-[10px] leading-4 font-normal text-slate-400">{row.hint}</p>
                  </th>
                  {items.map((item) => {
                    const isBest = winners[row.key].has(item.id);
                    const detail = row.detail?.(item);
                    return (
                      <td key={item.id} className={`px-4 py-2.5 align-top ${isBest ? "bg-emerald-50/60" : ""}`}>
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className={`truncate font-semibold tabular-nums ${isBest ? "text-emerald-700" : "text-slate-800"}`}>{row.value(item)}</span>
                          {isBest && <Check className="size-3.5 shrink-0 text-emerald-600" aria-label={t("marketRadar.compareBest", { defaultValue: "Best" })} />}
                        </div>
                        {detail && <p className="mt-0.5 truncate text-[11px] text-slate-500" title={detail}>{detail}</p>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TooltipProvider>
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
    ? "border-emerald-100 bg-emerald-50/60"
    : tone === "amber"
      ? "border-amber-100 bg-amber-50/60"
      : "border-blue-100 bg-blue-50/70";
  return (
    <div className={`rounded-xl border px-3 py-3 ${toneClass}`}>
      <p className="text-[10px] font-bold tracking-[0.1em] text-slate-500 uppercase">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-900" title={title}>{title}</p>
      <p className="mt-1 text-xs text-slate-600">{detail}</p>
    </div>
  );
}

function CompactProfileSummary({ profile }: { profile: SellerResearchProfileInput }) {
  const { t } = useTranslation("common");
  const categories = profile.preferredCategories.slice(0, 2);
  const price = profile.minimumPrice != null || profile.maximumPrice != null
    ? `$${profile.minimumPrice ?? 0} - ${profile.maximumPrice != null ? `$${profile.maximumPrice}` : t("marketRadar.anyPrice", { defaultValue: "any" })}`
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 px-5 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-slate-700" title={profile.shopGoal ?? undefined}>{profile.shopGoal || t("marketRadar.notSet")}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{categories.length > 0 ? categories.join(" · ") : t("marketRadar.notSet")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {price && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-100">{price}</span>}
        {profile.targetAudiences.length > 0 && <span className="text-slate-500">{profile.targetAudiences.length} {t("marketRadar.audiences", { defaultValue: "audiences" })}</span>}
        {profile.preferredKeywords.length > 0 && <span className="text-slate-500">{profile.preferredKeywords.length} {t("marketRadar.keywords", { defaultValue: "keywords" })}</span>}
      </div>
    </div>
  );
}

function ProfileField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const { t } = useTranslation("common");
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2"><Label htmlFor={id}>{label}</Label><span className="text-[11px] text-slate-400">{t("marketRadar.separateWithCommas")}</span></div>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function EmptyRadar({ hasProfile, filtered, stateName, building, onBuild, onSetup }: { hasProfile: boolean; filtered: boolean; stateName: string; building: boolean; onBuild: () => void; onSetup: () => void }) {
  const { t } = useTranslation("common");
  if (filtered) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">{t("marketRadar.noData", { state: stateName.toLowerCase() })}</div>;
  }
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Sparkles className="size-6" /></span>
      <h3 className="mt-4 font-semibold text-slate-900">{hasProfile ? t("marketRadar.radarReady") : t("marketRadar.setupProfile")}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
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
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex justify-between gap-4">
        <div className="flex-1 space-y-3"><div className="h-3 w-24 rounded bg-slate-100" /><div className="h-5 w-2/3 rounded bg-slate-100" /><div className="h-3 w-20 rounded bg-slate-100" /></div>
        <div className="size-14 rounded-full bg-slate-100" />
      </div>
      <div className="mt-5 h-3 w-full rounded bg-slate-100" /><div className="mt-2 h-3 w-4/5 rounded bg-slate-100" />
      <div className="mt-5 h-16 rounded-xl bg-slate-50" />
    </div>
  );
}

function OpportunityMeta({ item, featured = false }: { item: SellerOpportunity; featured?: boolean }) {
  const { t } = useTranslation("common");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-md bg-[#17263f] px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">#{item.rank ?? "—"}</span>
      {featured && <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-[11px] font-semibold text-white"><Trophy className="size-3" />{t("marketRadar.topPick")}</span>}
      <span className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">{item.platform}</span>
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
      <Button type="button" variant="outline" size="sm" className={"px-3 sm:px-4 " + (isSaved ? "border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 hover:text-amber-800" : "")} disabled={busy} onClick={() => onState(isSaved ? "new" : "saved")}><Bookmark className={isSaved ? "size-3.5 fill-current" : "size-3.5"} />{isSaved ? t("marketRadar.saved") : t("marketRadar.save")}</Button>
      <Button type="button" variant="outline" size="sm" className={"px-3 sm:px-4 " + (isActed ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "")} disabled={busy} onClick={() => onState(isActed ? "new" : "acted")}><Check className={isActed ? "size-3.5 fill-current" : "size-3.5"} />{isActed ? t("marketRadar.acted") : t("marketRadar.markActed")}</Button>
      <Button type="button" variant="ghost" size="sm" className={"px-3 sm:px-4 " + (isCompared ? "bg-blue-50 text-blue-700" : "text-slate-500")} onClick={onCompare}><GitCompareArrows className="size-3.5" />{isCompared ? t("marketRadar.compared") : t("marketRadar.compare")}</Button>
      <Button type="button" variant="ghost" size="sm" className={"px-3 text-slate-500 sm:px-4 " + (compact ? "" : "ml-auto")} disabled={busy} onClick={() => onState("ignored")}>{t("marketRadar.ignore")}</Button>
    </>
  );
}

/** A title cut to a fixed number of lines with an ellipsis; the full text shows in a tooltip on hover or focus. */
function ClampedTitle({ as: Tag, title, lines, className }: { as: "h3" | "p"; title: string; lines: 1 | 2; className: string }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Tag tabIndex={0} className={`${className} ${lines === 1 ? "truncate" : "line-clamp-2"} cursor-default break-words outline-none focus-visible:ring-2 focus-visible:ring-blue-200`}>
            {title}
          </Tag>
        </TooltipTrigger>
        <TooltipContent className="max-w-md text-sm leading-5">{title}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function OpportunityCard({ item, featured, ...actions }: CardActions & { item: SellerOpportunity; featured: boolean }) {
  const { t } = useTranslation("common");
  return (
    <Card className={"flex flex-col gap-0 bg-white py-0 shadow-sm transition-shadow hover:shadow-md " + (featured ? "border-amber-200 ring-1 ring-amber-100 lg:col-span-2" : "border-slate-200")}>
      <div className={"flex flex-1 flex-col gap-4 p-5 " + (featured ? "bg-gradient-to-br from-amber-50/60 via-white to-white" : "")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <OpportunityMeta item={item} featured={featured} />
            <ClampedTitle as="h3" title={item.title} lines={2} className={"mt-2 leading-snug font-semibold text-slate-900 " + (featured ? "text-xl" : "text-lg")} />
            <p className="mt-0.5 text-sm text-slate-500 capitalize">{item.category ?? item.niche}</p>
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
            <details className="group rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2">
              <summary className="cursor-pointer list-none text-xs font-semibold text-slate-600 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="group-open:hidden">{t("marketRadar.viewDetails", { defaultValue: "View supporting details" })}</span>
                <span className="hidden group-open:inline">{t("marketRadar.collapse", { defaultValue: "Collapse details" })}</span>
              </summary>
              <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                <ListingOverview summary={item.summary} />
                <p className="flex items-start gap-1.5 text-xs leading-5 text-slate-500"><CircleHelp className="mt-0.5 size-3.5 shrink-0" />{item.fitExplanation ?? t("marketRadar.rankedContext")}</p>
                <OpportunityInsights item={item} />
                {actions.analysis && <AnalysisPanel analysis={actions.analysis} />}
              </div>
            </details>
          </>
        )}

        {featured && <OpportunityInsights item={item} />}

        {featured && <p className="flex items-start gap-1.5 text-xs leading-5 text-slate-500"><CircleHelp className="mt-0.5 size-3.5 shrink-0" />{item.fitExplanation ?? t("marketRadar.rankedContext")}</p>}

        {featured && actions.analysis && (
          <details className="group rounded-xl border border-blue-100 bg-blue-50/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="group-open:hidden">{t("marketRadar.viewAiAnalysis", { defaultValue: "View AI analysis" })}</span>
              <span className="hidden group-open:inline">{t("marketRadar.collapse")}</span>
              <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
            </summary>
            <div className="border-t border-blue-100 p-3"><AnalysisPanel analysis={actions.analysis} /></div>
          </details>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
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
    <div className={(compact ? "" : "space-y-3 ") + "rounded-xl border border-slate-100 bg-slate-50/80 p-3"}>
        <div className="grid gap-3 sm:grid-cols-5">
        <NicheMarketMetrics item={item} />
        <InsightMetric label={insight.priceLabel === "observed" ? t("marketRadar.observedPrice") : t("marketRadar.typicalPrice")} value={priceText} detail={insight.minimumPrice == null || insight.maximumPrice == null ? t("marketRadar.limitedPriceData") : `${insight.minimumPrice.toFixed(0)}–${insight.maximumPrice.toFixed(0)} range`} />
        <InsightMetric label={t("marketRadar.confidence", { defaultValue: "Confidence" })} value={insight.evidenceQuality} detail={`${insight.distinctListingCount} listings · ${insight.observationPeriodCount} day(s)`} />
        <InsightMetric label={t("marketRadar.freshness", { defaultValue: "Freshness" })} value={formatFreshness(insight.freshnessLabel, t)} detail={freshnessDetail(insight, t)} tone={insight.freshnessLabel === "fresh" ? "up" : insight.freshnessLabel === "stale" ? "down" : undefined} />
      </div>
      {!compact && <>
      {item.nicheMarket && item.nicheMarket.risingNewListingCount > 0 && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">
          {t("marketRadar.nicheOpenForNewSellers", { defaultValue: "{{count}} listing(s) under 90 days old in this niche already gain favorites quickly." , count: item.nicheMarket.risingNewListingCount })}
        </p>
      )}
      {insight.evidenceQuality === "insufficient" && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          {t("marketRadar.earlySignal", { defaultValue: "Early signal only — collect more listings and observation periods before making a large investment." })}
        </p>
      )}

      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-slate-600 marker:text-slate-400">{t("marketRadar.whyScore")}</summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(insight.marketScoreBreakdown)
            .filter(([key]) => !["formulaVersion", "viralScore"].includes(key))
            .map(([key, value]) => (
              <span key={key} className="rounded-full bg-white px-2 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200">
                {humanizeInsightKey(key)}: {typeof value === "number" ? value.toFixed(0) : value}
              </span>
            ))}
        </div>
        <div className="mt-2 space-y-1 text-xs text-slate-500">
          <p>{t("marketRadar.observedFrom", { from: new Date(insight.firstObservedAt).toLocaleDateString(), to: new Date(insight.lastObservedAt).toLocaleDateString() })}</p>
          {insight.evidence.slice(0, 3).map((evidence) => (
            <p key={`${evidence.title}-${evidence.observedAt}`} className="truncate">
              {evidence.sourceUrl ? <a className="text-blue-600 hover:underline" href={evidence.sourceUrl} target="_blank" rel="noreferrer">{evidence.title}</a> : evidence.title}
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
    <details className="group rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">
            {cleanSummary(summary)}
          </p>
          <span className="shrink-0 pt-1 text-xs font-semibold text-blue-600 group-open:text-slate-500">
            <span className="group-open:hidden">{t("marketRadar.readFull")}</span>
            <span className="hidden group-open:inline">{t("marketRadar.collapse")}</span>
          </span>
        </div>
      </summary>
      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto border-t border-slate-200 pt-3 text-sm leading-6 text-slate-700">
        {sections.map((section, index) => (
          <div key={`${section.slice(0, 24)}-${index}`} className={isSummaryHeading(section) ? "space-y-1" : undefined}>
            {isSummaryHeading(section) ? (
              <h4 className="text-xs font-bold tracking-[0.12em] text-slate-500 uppercase">{section}</h4>
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
  const valueTone = tone === "up" ? "text-emerald-700" : tone === "down" ? "text-rose-700" : "text-slate-800";
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-400 uppercase">{label}</p>
      <p className={`mt-0.5 truncate text-sm font-semibold capitalize ${valueTone}`}>{value}</p>
      <p className="truncate text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

function ScoreMeter({ value, tone = "blue" }: { value: number; tone?: "blue" | "green" | "amber" | "slate" }) {
  const score = Math.round(value);
  const bar = tone === "green" ? "bg-emerald-500" : tone === "amber" ? "bg-amber-500" : tone === "slate" ? "bg-slate-400" : "bg-blue-500";
  return (
    <div className="w-28 min-w-28">
      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700 tabular-nums"><span>{score}</span><span className="text-[10px] font-normal text-slate-400">/100</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} /></div>
    </div>
  );
}

function ScoreComposition({ item }: { item: SellerOpportunity }) {
  const { t } = useTranslation("common");
  const adjustedMarket = item.fitBreakdown.evidenceAdjustedMarketScore ?? item.marketOpportunityScore;
  const marketContribution = adjustedMarket * 0.6;
  const sellerContribution = item.sellerFitScore * 0.4;
  return (
    <div className="border-t border-blue-100 bg-blue-50/30 px-5 py-4">
      <p className="text-[10px] font-bold tracking-[0.12em] text-slate-500 uppercase">{t("marketRadar.scoreComposition", { defaultValue: "Score composition" })}</p>
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
      <div className="flex items-center justify-between gap-2 text-xs text-slate-600"><span>{label}</span><span className="font-semibold text-slate-800 tabular-nums">{detail}</span></div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white ring-1 ring-blue-100"><div className={`h-full rounded-full ${tone === "green" ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} /></div>
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
      <div className="grid gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50/60 md:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,16rem)_auto] md:items-center md:gap-5">
        <div className="min-w-0">
          <OpportunityMeta item={item} />
          <ClampedTitle as="p" title={item.title} lines={1} className="mt-1 font-semibold text-slate-900" />
          <p className="truncate text-xs text-slate-500"><span className="capitalize">{item.category ?? item.niche}</span>{item.fitExplanation ? ` · ${item.fitExplanation}` : ` · ${t("marketRadar.rankedContext")}`}</p>
        </div>
        <FitScoreTooltip item={item}>
          <button type="button" className={"w-fit cursor-help text-2xl font-bold tabular-nums md:mx-auto " + scoreTone(score).text} aria-label={`Fit score ${score}. How is this calculated?`}>{score}</button>
        </FitScoreTooltip>
        <ScoreBars item={item} compact />
        <div className="flex flex-wrap items-center gap-1.5 md:justify-end"><OpportunityActions item={item} {...actions} compact /></div>
      </div>
      {actions.analysis && (
        <details className="group border-b border-slate-100 bg-slate-50/60 px-4 py-2">
          <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold text-slate-600 marker:hidden [&::-webkit-details-marker]:hidden">
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
    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-semibold text-slate-900"><Sparkles className="size-4 text-blue-600" />{t("marketRadar.aiAnalyst", { defaultValue: "AI analyst" })}</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-blue-100">{analysis.model}</span>
      </div>
      <p className="mt-2 leading-6">{analysis.summary}</p>
      <p className="mt-3 rounded-lg border-l-2 border-blue-500 bg-white/70 px-3 py-2 font-medium text-blue-900">{analysis.recommendation}</p>
      {analysis.actionPlan.length > 0 && (
        <ol className="mt-3 space-y-1.5">
          {analysis.actionPlan.slice(0, 3).map((step, index) => (
            <li key={step} className="flex gap-2"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">{index + 1}</span><span>{step}</span></li>
          ))}
        </ol>
      )}
      <p className="mt-3 text-xs text-slate-500">{analysis.confidenceNote}</p>
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
        <p className="text-slate-300 tabular-nums">{adjustedMarket} × 0.6 + {fit} × 0.4 = {Math.round(item.finalScore)}</p>
        <p className="text-slate-400">{rawMarket} raw market → {adjustedMarket} {t("marketRadar.adjustedMarket", { defaultValue: "adjusted market" })} after evidence and freshness.</p>
        <p className="text-slate-400">{t("marketRadar.confidenceExplanation", { defaultValue: "Confidence shows how much evidence backs the market score. It does not change the fit score." })}</p>
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
            <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5" className="stroke-slate-100" />
            <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5" strokeLinecap="round" className={tone.ring} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - Math.min(Math.max(score, 0), 100) / 100)} />
          </svg>
          <span className={"absolute inset-0 flex items-center justify-center text-base font-bold tabular-nums " + tone.text}>{score}</span>
        </span>
        <span className="mt-1 flex items-center gap-0.5 text-[10px] tracking-wider text-slate-400 uppercase">{t("marketRadar.fitScore")}<CircleHelp className="size-2.5" /></span>
      </button>
    </FitScoreTooltip>
  );
}

function ScoreBars({ item, compact = false }: { item: SellerOpportunity; compact?: boolean }) {
  const { t } = useTranslation("common");
  return (
    <div className={"grid grid-cols-3 " + (compact ? "gap-3" : "gap-4 rounded-xl bg-slate-50 p-3")}>
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
      <div className="flex items-baseline justify-between gap-1"><p className="truncate text-[11px] text-slate-500">{label}</p><p className="text-sm font-semibold text-slate-800 tabular-nums">{score}</p></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className={"h-full rounded-full " + scoreTone(score).bar} style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }} /></div>
    </div>
  );
}
