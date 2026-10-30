"use client";

import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { Bookmark, CircleHelp, Clock, Compass, LayoutGrid, List, Pencil, RefreshCw, SlidersHorizontal, Sparkles, Trophy, X } from "lucide-react";
import { toast } from "sonner";

import {
  analyzeSellerOpportunity,
  getSellerResearchProfile,
  listSellerOpportunities,
  type OpportunityAnalysis,
  refreshSellerOpportunities,
  saveSellerResearchProfile,
  type SellerOpportunity,
  type SellerResearchProfileInput,
  updateSellerOpportunityState,
} from "@/api/market-opportunities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const profileKey = ["seller-research-profile"];
const opportunityKey = ["seller-opportunities"];

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

// Same thresholds everywhere a score is coloured: strong, worth a look, weak.
const scoreTone = (score: number) =>
  score >= 75
    ? { text: "text-emerald-600", bar: "bg-emerald-500", ring: "stroke-emerald-500" }
    : score >= 50
      ? { text: "text-amber-600", bar: "bg-amber-500", ring: "stroke-amber-500" }
      : { text: "text-slate-500", bar: "bg-slate-400", ring: "stroke-slate-400" };

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
};

export function OpportunityRadarPage() {
  const queryClient = useQueryClient();
  const [activeState, setActiveState] = useState("all");
  const [view, setView] = useState<"cards" | "list">("cards");
  const [profile, setProfile] = useState<SellerResearchProfileInput>(initialProfile);
  const [profileOpen, setProfileOpen] = useState(true);
  const [analysis, setAnalysis] = useState<Record<string, OpportunityAnalysis>>({});
  const profileQuery = useQuery({ queryKey: profileKey, queryFn: getSellerResearchProfile });
  const opportunitiesQuery = useQuery({
    queryKey: [...opportunityKey, activeState],
    queryFn: () => listSellerOpportunities(activeState === "all" ? undefined : activeState),
  });
  // The unfiltered list feeds the tab counts and the hero; on the All tab it is the same query.
  const allQuery = useQuery({ queryKey: [...opportunityKey, "all"], queryFn: () => listSellerOpportunities() });
  const hasProfile = Boolean(profileQuery.data?.profileVersion);

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
    // A saved profile is shown as a summary; the form opens only to edit it.
    if (profileQuery.data.profileVersion) setProfileOpen(false);
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: saveSellerResearchProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(profileKey, data);
      setProfileOpen(false);
      toast.success("Seller profile saved");
    },
    onError: () => toast.error("Could not save your seller profile"),
  });
  const refreshMutation = useMutation({
    mutationFn: refreshSellerOpportunities,
    onSuccess: (data) => {
      queryClient.setQueryData([...opportunityKey, activeState], data);
      queryClient.invalidateQueries({ queryKey: opportunityKey });
      if (data.length > 0) {
        toast.success(`Radar built with ${data.length} opportunit${data.length === 1 ? "y" : "ies"}`);
      } else {
        toast.info("Radar refreshed, but no active market data is available yet");
      }
    },
    onError: () => toast.error("Could not build the radar. Please try again."),
  });
  const stateMutation = useMutation({
    mutationFn: ({ id, state }: { id: string; state: SellerOpportunity["state"] }) => updateSellerOpportunityState(id, state),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: opportunityKey }),
    onError: () => toast.error("Could not update this opportunity"),
  });
  const analysisMutation = useMutation({
    mutationFn: analyzeSellerOpportunity,
    onSuccess: (result) => setAnalysis((current) => ({ ...current, [result.sellerOpportunityId]: result })),
    onError: () => toast.error("Could not analyze this opportunity"),
  });
  const opportunities = useMemo(() => opportunitiesQuery.data ?? [], [opportunitiesQuery.data]);
  const allOpportunities = useMemo(() => allQuery.data ?? [], [allQuery.data]);
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
  const updateList = (key: keyof SellerResearchProfileInput, value: string) =>
    setProfile((current) => ({ ...current, [key]: splitValues(value) }));
  const actionsFor = (item: SellerOpportunity): CardActions => ({
    busy: stateMutation.isPending,
    analysis: analysis[item.id],
    analyzing: analysisMutation.isPending && analysisMutation.variables === item.id,
    onAnalyze: () => analysisMutation.mutate(item.id),
    onState: (state) => stateMutation.mutate({ id: item.id, state }),
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
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Market Opportunity Radar</h1>
                <p className="mt-0.5 text-sm text-slate-300">Market signals ranked against your shop goals and price range.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-white/[0.06]">
                <HeroStat label="Opportunities" value={String(allOpportunities.length)} />
                <HeroStat label="Average fit" value={allOpportunities.length ? `${averageScore}/100` : "—"} />
                <HeroStat label="Profile" value={hasProfile ? "Ready" : "Setup"} />
              </div>
              <div className="flex flex-col items-stretch gap-1 sm:items-end">
                <Button type="button" variant="primaryBlue" className="shrink-0" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
                  <RefreshCw className={refreshMutation.isPending ? "size-4 animate-spin" : "size-4"} />
                  {refreshMutation.isPending ? "Refreshing..." : "Refresh ranking"}
                </Button>
                {lastEvaluatedAt && <p className="flex items-center justify-center gap-1 text-[11px] text-slate-400"><Clock className="size-3" />Updated {timeAgo(lastEvaluatedAt)}</p>}
              </div>
            </div>
          </div>
        </section>

        <Card className="gap-0 border-slate-200 bg-white py-0 shadow-sm">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><SlidersHorizontal className="size-4" /></span>
              <div>
                <h2 className="font-semibold text-slate-900">Your seller profile</h2>
                <p className="text-sm text-slate-500">This context changes the ranking you receive. It is never shared with other sellers.</p>
              </div>
            </div>
            {hasProfile && (
              <Button type="button" variant="outline" size="sm" className="shrink-0 self-start sm:self-center" onClick={() => setProfileOpen((open) => !open)}>
                {profileOpen ? <><X className="size-3.5" />Close</> : <><Pencil className="size-3.5" />Edit profile</>}
              </Button>
            )}
          </div>

          {!profileOpen && hasProfile && <ProfileSummary profile={profile} />}

          {profileOpen && (
            <form className="grid gap-5 border-t border-slate-100 p-5 lg:grid-cols-2" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(profile); }}>
              <div className="space-y-2 lg:col-span-2">
                <Label htmlFor="shop-goal">Shop goal</Label>
                <Textarea id="shop-goal" value={profile.shopGoal ?? ""} onChange={(event) => setProfile((current) => ({ ...current, shopGoal: event.target.value }))} placeholder="e.g. Find profitable personalized home decor niches for Q4" />
              </div>
              <ProfileField id="audiences" label="Target audiences" value={profile.targetAudiences.join(", ")} onChange={(value) => updateList("targetAudiences", value)} placeholder="new homeowners, gift buyers" />
              <ProfileField id="categories" label="Preferred categories" value={profile.preferredCategories.join(", ")} onChange={(value) => updateList("preferredCategories", value)} placeholder="home decor, gifts" />
              <ProfileField id="excluded" label="Excluded categories" value={profile.excludedCategories.join(", ")} onChange={(value) => updateList("excludedCategories", value)} placeholder="clothing, jewelry" />
              <ProfileField id="keywords" label="Preferred keywords" value={profile.preferredKeywords.join(", ")} onChange={(value) => updateList("preferredKeywords", value)} placeholder="personalized, wood, minimal" />
              <div className="space-y-2">
                <Label>Target price range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" min="0" placeholder="Min" value={profile.minimumPrice ?? ""} onChange={(event) => setProfile((current) => ({ ...current, minimumPrice: event.target.value ? Number(event.target.value) : null }))} />
                  <Input type="number" min="0" placeholder="Max" value={profile.maximumPrice ?? ""} onChange={(event) => setProfile((current) => ({ ...current, maximumPrice: event.target.value ? Number(event.target.value) : null }))} />
                </div>
              </div>
              <div className="flex items-end justify-end lg:col-span-2"><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save profile"}</Button></div>
            </form>
          )}
        </Card>

        <section className="space-y-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
            <div><h2 className="text-lg font-semibold text-slate-900">Recommended opportunities</h2><p className="mt-1 text-sm text-slate-500">Sorted by market potential and fit with your seller profile.</p></div>
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
                    {filter.label}
                    <span className={"rounded-full px-1.5 text-[11px] tabular-nums " + (activeState === filter.value ? "bg-white/15" : "bg-slate-100 text-slate-500")}>{stateCounts[filter.value] ?? 0}</span>
                  </button>
                ))}
              </div>
              <div className="flex shrink-0 rounded-xl border border-slate-200 bg-white p-1">
                {([["cards", LayoutGrid, "Card view"], ["list", List, "List view"]] as const).map(([value, Icon, label]) => (
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
            <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-700">Could not load opportunities. Check the API connection and try again.</div>
          ) : opportunities.length === 0 ? (
            <EmptyRadar
              hasProfile={hasProfile}
              filtered={activeState !== "all"}
              stateName={stateFilters.find((filter) => filter.value === activeState)?.label ?? ""}
              building={refreshMutation.isPending}
              onBuild={() => refreshMutation.mutate()}
              onSetup={() => setProfileOpen(true)}
            />
          ) : view === "list" ? (
            <Card className="gap-0 overflow-hidden border-slate-200 bg-white py-0 shadow-sm">
              {opportunities.map((item) => <OpportunityRow key={item.id} item={item} {...actionsFor(item)} />)}
            </Card>
          ) : (
            <div className="grid items-start gap-4 lg:grid-cols-2">
              {opportunities.map((item) => <OpportunityCard key={item.id} item={item} featured={activeState === "all" && item.rank === 1} {...actionsFor(item)} />)}
            </div>
          )}
        </section>
      </div>
    </TooltipProvider>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-2 text-center sm:min-w-28 sm:px-4">
      <p className="text-lg font-semibold text-white tabular-nums">{value}</p>
      <p className="text-[9px] font-medium tracking-[0.08em] whitespace-nowrap text-slate-400 uppercase sm:text-[10px] sm:tracking-[0.12em]">{label}</p>
    </div>
  );
}

function ProfileSummary({ profile }: { profile: SellerResearchProfileInput }) {
  const price =
    profile.minimumPrice != null || profile.maximumPrice != null
      ? `$${profile.minimumPrice ?? 0} – ${profile.maximumPrice != null ? `$${profile.maximumPrice}` : "any"}`
      : null;
  const groups = [
    { label: "Audiences", values: profile.targetAudiences },
    { label: "Categories", values: profile.preferredCategories },
    { label: "Excluded", values: profile.excludedCategories, muted: true },
    { label: "Keywords", values: profile.preferredKeywords },
    { label: "Price", values: price ? [price] : [] },
  ];
  return (
    <div className="space-y-2.5 border-t border-slate-100 px-5 py-3.5">
      {profile.shopGoal && <p className="text-sm text-slate-700"><span className="font-medium text-slate-900">Goal: </span>{profile.shopGoal}</p>}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium tracking-[0.1em] text-slate-400 uppercase">{group.label}</span>
            {group.values.length === 0 ? <span className="text-xs text-slate-400">Not set</span> : group.values.map((value) => (
              <span key={value} className={"rounded-full px-2.5 py-0.5 text-xs ring-1 " + (group.muted ? "bg-slate-50 text-slate-500 line-through ring-slate-200" : "bg-blue-50 text-blue-700 ring-blue-100")}>{value}</span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2"><Label htmlFor={id}>{label}</Label><span className="text-[11px] text-slate-400">Separate with commas</span></div>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function EmptyRadar({ hasProfile, filtered, stateName, building, onBuild, onSetup }: { hasProfile: boolean; filtered: boolean; stateName: string; building: boolean; onBuild: () => void; onSetup: () => void }) {
  if (filtered) {
    return <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No {stateName.toLowerCase()} opportunities yet.</div>;
  }
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><Sparkles className="size-6" /></span>
      <h3 className="mt-4 font-semibold text-slate-900">{hasProfile ? "Your radar is ready" : "Set up your seller profile"}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
        {hasProfile
          ? "Your profile is saved. Build the radar after market data has been collected by the research sync."
          : "Tell the radar about your shop goal, audiences and price range so opportunities can be ranked for you."}
      </p>
      {hasProfile ? (
        <Button className="mt-5" type="button" onClick={onBuild} disabled={building}><RefreshCw className={building ? "size-4 animate-spin" : "size-4"} />{building ? "Building..." : "Build my radar"}</Button>
      ) : (
        <Button className="mt-5" type="button" onClick={onSetup}><SlidersHorizontal className="size-4" />Fill in my profile</Button>
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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-md bg-[#17263f] px-1.5 py-0.5 text-[11px] font-semibold text-white tabular-nums">#{item.rank ?? "—"}</span>
      {featured && <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-2 py-0.5 text-[11px] font-semibold text-white"><Trophy className="size-3" />Top pick</span>}
      <span className="text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">{item.platform}</span>
      <span className={"rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 " + stateStyle[item.state]}>{stateLabel[item.state]}</span>
    </div>
  );
}

function OpportunityActions({ item, busy, analysis, analyzing, onAnalyze, onState, compact = false }: CardActions & { item: SellerOpportunity; compact?: boolean }) {
  const isSaved = item.state === "saved";
  return (
    <>
      <Button type="button" variant="primaryBlue" size="sm" className="px-3 sm:px-4" disabled={analyzing} onClick={onAnalyze}><Sparkles className="size-3.5" />{analyzing ? "Analyzing..." : compact ? "Analyze" : analysis ? "Analyze again" : <>Analyze<span className="hidden sm:inline">&nbsp;with AI</span></>}</Button>
      <Button type="button" variant="outline" size="sm" className={"px-3 sm:px-4 " + (isSaved ? "border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400 hover:text-amber-800" : "")} disabled={busy} onClick={() => onState(isSaved ? "new" : "saved")}><Bookmark className={isSaved ? "size-3.5 fill-current" : "size-3.5"} />{isSaved ? "Saved" : "Save"}</Button>
      <Button type="button" variant="ghost" size="sm" className={"px-3 text-slate-500 sm:px-4 " + (compact ? "" : "ml-auto")} disabled={busy} onClick={() => onState("ignored")}>Ignore</Button>
    </>
  );
}

function OpportunityCard({ item, featured, ...actions }: CardActions & { item: SellerOpportunity; featured: boolean }) {
  return (
    <Card className={"flex flex-col gap-0 bg-white py-0 shadow-sm transition-shadow hover:shadow-md " + (featured ? "border-amber-200 ring-1 ring-amber-100 lg:col-span-2" : "border-slate-200")}>
      <div className={"flex flex-1 flex-col gap-4 p-5 " + (featured ? "bg-gradient-to-br from-amber-50/60 via-white to-white" : "")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <OpportunityMeta item={item} featured={featured} />
            <h3 className={"mt-2 leading-snug font-semibold text-slate-900 " + (featured ? "text-xl" : "text-lg")}>{item.title}</h3>
            <p className="mt-0.5 text-sm text-slate-500 capitalize">{item.category ?? item.niche}</p>
          </div>
          <ScoreRing item={item} />
        </div>

        <div className={featured ? "grid gap-4 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center" : "flex flex-col gap-4"}>
          {/* The fit explanation has its own line below, so it is not repeated here. */}
          <p className="line-clamp-2 min-h-12 text-sm leading-6 text-slate-600">{item.summary ?? "Market signal collected from public listing evidence."}</p>
          <ScoreBars item={item} />
        </div>

        <p className="flex items-start gap-1.5 text-xs leading-5 text-slate-500"><CircleHelp className="mt-0.5 size-3.5 shrink-0" />{item.fitExplanation ?? "Ranked from your profile context."}</p>

        {actions.analysis && <AnalysisPanel analysis={actions.analysis} />}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
        <OpportunityActions item={item} {...actions} />
      </div>
    </Card>
  );
}

function OpportunityRow({ item, ...actions }: CardActions & { item: SellerOpportunity }) {
  const score = Math.round(item.finalScore);
  return (
    <Fragment>
      <div className="grid gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50/60 md:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,16rem)_auto] md:items-center md:gap-5">
        <div className="min-w-0">
          <OpportunityMeta item={item} />
          <p className="mt-1 truncate font-semibold text-slate-900" title={item.title}>{item.title}</p>
          <p className="truncate text-xs text-slate-500"><span className="capitalize">{item.category ?? item.niche}</span>{item.fitExplanation ? ` · ${item.fitExplanation}` : ""}</p>
        </div>
        <FitScoreTooltip item={item}>
          <button type="button" className={"w-fit cursor-help text-2xl font-bold tabular-nums md:mx-auto " + scoreTone(score).text} aria-label={`Fit score ${score}. How is this calculated?`}>{score}</button>
        </FitScoreTooltip>
        <ScoreBars item={item} compact />
        <div className="flex flex-wrap items-center gap-1.5 md:justify-end"><OpportunityActions item={item} {...actions} compact /></div>
      </div>
      {actions.analysis && <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3"><AnalysisPanel analysis={actions.analysis} /></div>}
    </Fragment>
  );
}

function AnalysisPanel({ analysis }: { analysis: OpportunityAnalysis }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-semibold text-slate-900"><Sparkles className="size-4 text-blue-600" />AI analyst</p>
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
  const market = Math.round(item.marketOpportunityScore);
  const fit = Math.round(item.sellerFitScore);
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="left" className="max-w-64 space-y-1 bg-[#17263f] px-3 py-2 text-xs text-white">
        <p className="font-semibold text-white">Fit score = 60% Market + 40% Seller fit</p>
        <p className="text-slate-300 tabular-nums">{market} × 0.6 + {fit} × 0.4 = {Math.round(item.finalScore)}</p>
        <p className="text-slate-400">Confidence shows how much evidence backs the market score. It does not change the fit score.</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Final score as a ring: the arc fills to the score out of 100.
function ScoreRing({ item }: { item: SellerOpportunity }) {
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
        <span className="mt-1 flex items-center gap-0.5 text-[10px] tracking-wider text-slate-400 uppercase">fit score<CircleHelp className="size-2.5" /></span>
      </button>
    </FitScoreTooltip>
  );
}

function ScoreBars({ item, compact = false }: { item: SellerOpportunity; compact?: boolean }) {
  return (
    <div className={"grid grid-cols-3 " + (compact ? "gap-3" : "gap-4 rounded-xl bg-slate-50 p-3")}>
      <ScoreBar label="Market" value={item.marketOpportunityScore} />
      <ScoreBar label={compact ? "Fit" : "Seller fit"} value={item.sellerFitScore} />
      <ScoreBar label={compact ? "Conf." : "Confidence"} value={item.confidence * 100} />
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
