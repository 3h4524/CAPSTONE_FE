"use client";

import { useEffect, useMemo, useState } from "react";
import { Bookmark, ChevronRight, CircleHelp, Compass, RefreshCw, SlidersHorizontal, Sparkles, Target, TrendingUp } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

export function OpportunityRadarPage() {
  const queryClient = useQueryClient();
  const [activeState, setActiveState] = useState("all");
  const [profile, setProfile] = useState<SellerResearchProfileInput>(initialProfile);
  const [profileOpen, setProfileOpen] = useState(true);
  const [analysis, setAnalysis] = useState<Record<string, OpportunityAnalysis>>({});
  const profileQuery = useQuery({ queryKey: profileKey, queryFn: getSellerResearchProfile });
  const opportunitiesQuery = useQuery({
    queryKey: [...opportunityKey, activeState],
    queryFn: () => listSellerOpportunities(activeState === "all" ? undefined : activeState),
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
  const averageScore = useMemo(
    () => opportunities.length ? Math.round(opportunities.reduce((sum, item) => sum + item.finalScore, 0) / opportunities.length) : 0,
    [opportunities],
  );
  const updateList = (key: keyof SellerResearchProfileInput, value: string) =>
    setProfile((current) => ({ ...current, [key]: splitValues(value) }));

  return (
    <div className="flex w-full min-w-0 flex-col gap-6 p-4 sm:p-6">
      <section className="relative overflow-hidden rounded-2xl bg-[#17263f] px-6 py-7 text-white shadow-[0_16px_40px_rgba(23,38,63,0.2)] sm:px-8">
        <div className="absolute -top-24 -right-20 size-72 rounded-full bg-blue-400/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-200"><Compass className="size-4" />Seller intelligence</div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Market Opportunity Radar</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Discover market signals, then rank them against your shop goals, products and price range.</p>
          </div>
          <Button type="button" variant="primaryBlue" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}>
            <RefreshCw className={refreshMutation.isPending ? "size-4 animate-spin" : "size-4"} />
            {refreshMutation.isPending ? "Refreshing..." : "Refresh ranking"}
          </Button>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={TrendingUp} label="Opportunities" value={String(opportunities.length)} detail="ranked for your shop" />
        <MetricCard icon={Target} label="Average fit" value={String(averageScore) + "/100"} detail="market + seller signal" />
        <MetricCard icon={Sparkles} label="Profile status" value={profileQuery.data?.profileVersion ? "Ready" : "Setup"} detail="personalization context" />
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="cursor-pointer border-b border-slate-100" onClick={() => setProfileOpen((open) => !open)}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-slate-900"><SlidersHorizontal className="size-4 text-blue-600" />Your seller profile</CardTitle>
              <CardDescription className="mt-2">This context changes the ranking you receive. It is never shared with other sellers.</CardDescription>
            </div>
            <ChevronRight className={"mt-1 size-5 text-slate-400 transition-transform " + (profileOpen ? "rotate-90" : "")} />
          </div>
        </CardHeader>
        {profileOpen && (
          <CardContent className="pt-6">
            <form className="grid gap-5 lg:grid-cols-2" onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(profile); }}>
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
              <div className="flex justify-end lg:col-span-2"><Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : "Save profile"}</Button></div>
            </form>
          </CardContent>
        )}
      </Card>

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div><h2 className="text-lg font-semibold text-slate-900">Recommended opportunities</h2><p className="mt-1 text-sm text-slate-500">Sorted by market potential and fit with your seller profile.</p></div>
          <Select value={activeState} onValueChange={setActiveState}>
            <SelectTrigger className="w-full bg-white sm:w-40"><SelectValue placeholder="All states" /></SelectTrigger>
            <SelectContent position="popper" align="end" className="w-40 bg-white">
              <SelectItem value="all">All states</SelectItem><SelectItem value="new">New</SelectItem><SelectItem value="saved">Saved</SelectItem><SelectItem value="ignored">Ignored</SelectItem><SelectItem value="acted">Acted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {opportunitiesQuery.isPending ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading opportunities...</div>
        ) : opportunitiesQuery.isError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-700">Could not load opportunities. Check the API connection and try again.</div>
        ) : opportunities.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center"><Sparkles className="mx-auto size-8 text-blue-500" /><h3 className="mt-3 font-semibold text-slate-900">Your radar is ready</h3><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Your profile is saved. Build the radar after market data has been collected by the research sync.</p><Button className="mt-5" type="button" onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending}><RefreshCw className={refreshMutation.isPending ? "size-4 animate-spin" : "size-4"} />{refreshMutation.isPending ? "Building..." : "Build my radar"}</Button></div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">{opportunities.map((item) => <OpportunityCard key={item.id} item={item} busy={stateMutation.isPending} analysis={analysis[item.id]} analyzing={analysisMutation.isPending && analysisMutation.variables === item.id} onAnalyze={() => analysisMutation.mutate(item.id)} onState={(state) => stateMutation.mutate({ id: item.id, state })} />)}</div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: typeof TrendingUp; label: string; value: string; detail: string }) {
  return <Card className="border-slate-200 bg-white shadow-sm"><CardContent className="flex items-center gap-4 pt-6"><div className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon className="size-5" /></div><div><p className="text-xs font-medium tracking-[0.12em] text-slate-500 uppercase">{label}</p><p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p><p className="text-xs text-slate-500">{detail}</p></div></CardContent></Card>;
}

function ProfileField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}

function OpportunityCard({ item, busy, analysis, analyzing, onAnalyze, onState }: { item: SellerOpportunity; busy: boolean; analysis?: OpportunityAnalysis; analyzing: boolean; onAnalyze: () => void; onState: (state: SellerOpportunity["state"]) => void }) {
  const scoreTone = item.finalScore >= 75 ? "text-emerald-600" : item.finalScore >= 50 ? "text-amber-600" : "text-slate-500";
  return (
    <Card className="border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-[0.12em] text-blue-600 uppercase">{"#" + (item.rank ?? "—") + " · " + item.platform}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{stateLabel[item.state]}</span>
            </div>
            <CardTitle className="mt-2 text-lg text-slate-900">{item.title}</CardTitle>
            <CardDescription className="mt-1">{item.category ?? item.niche}</CardDescription>
          </div>
          <div className="text-right"><p className={"text-2xl font-bold " + scoreTone}>{Math.round(item.finalScore)}</p><p className="text-[11px] tracking-wider text-slate-400 uppercase">fit score</p></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="line-clamp-2 text-sm leading-6 text-slate-600">{item.summary ?? item.fitExplanation ?? "Market signal collected from public listing evidence."}</p>
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center"><Score label="Market" value={item.marketOpportunityScore} /><Score label="Seller fit" value={item.sellerFitScore} /><Score label="Confidence" value={item.confidence * 100} /></div>
        {analysis && <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-slate-700"><p className="font-semibold text-slate-900">AI analyst</p><p className="mt-1">{analysis.summary}</p><p className="mt-2 font-medium text-blue-800">{analysis.recommendation}</p>{analysis.actionPlan.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{analysis.actionPlan.slice(0, 3).map((step) => <li key={step}>{step}</li>)}</ul>}<p className="mt-2 text-xs text-slate-500">{analysis.model} · {analysis.confidenceNote}</p></div>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-xs text-slate-500"><CircleHelp className="size-3.5" />{item.fitExplanation ?? "Ranked from your profile context."}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="primaryBlue" size="sm" disabled={analyzing} onClick={onAnalyze}><Sparkles className="size-3.5" />{analyzing ? "Analyzing..." : analysis ? "Analyze again" : "Analyze with AI"}</Button>
            <Button type="button" variant={item.state === "saved" ? "secondary" : "outline"} size="sm" disabled={busy} onClick={() => onState(item.state === "saved" ? "new" : "saved")}><Bookmark className="size-3.5" />{item.state === "saved" ? "Saved" : "Save"}</Button>
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onState("ignored")}>Ignore</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Score({ label, value }: { label: string; value: number }) {
  return <div><p className="text-base font-semibold text-slate-800">{Math.round(value)}</p><p className="text-[11px] text-slate-500">{label}</p></div>;
}
