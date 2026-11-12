"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock3,
  Database,
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  Play,
  Save,
  Search,
  Sparkles,
} from "lucide-react";

import {
  getMarketResearchSchedule,
  type MarketResearchResponse,
  updateMarketResearchSchedule,
} from "@/api/market-research";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useRetrieveMarketResearch } from "@/hooks/mutations/use-retrieve-market-research";
import { useQuery } from "@/hooks/queries/use-query";

// Matches MarketResearchScheduleService.MaximumQueries in the backend.
const MAX_QUERIES = 300;

const DEFAULT_QUERIES = [
  "personalized friend gift",
  "custom pet gift",
  "pet ornament",
  "whimsical ornament",
  "bedazzled kit",
  "custom napkins",
  "friendsmas party supplies",
  "whimsical holiday decor",
  "rhinestone christmas decor",
  "ruffle tablecloth",
  "lace table decor",
  "diy ornament kit",
  "holiday craft kit",
  "beginner sewing pattern",
  "hand woven home decor",
  "hand painted home decor",
  "personalized teacher gift",
  "custom wedding sign",
  "bridesmaid gift",
  "birth flower necklace",
  "memorial pet gift",
  "gallery wall art",
  "book lover gift",
  "crochet animal gift",
].join("\n");
const RESEARCH_HISTORY_KEY = "apcs.admin.market-research.history";
const RESEARCH_RUN_COUNTER_KEY = "apcs.admin.market-research.run-counter";

const SUGGESTED_NICHES = [
  {
    label: "Hiking & outdoors",
    queries: ["hiking shirt", "outdoor shirt", "mountain hiking gift"],
  },
  {
    label: "Camping gifts",
    queries: ["camping t shirt", "camping gift", "nature lover gift"],
  },
  {
    label: "Adventure apparel",
    queries: ["adventure shirt", "travel shirt", "funny outdoor shirt"],
  },
  {
    label: "Seasonal ideas",
    queries: ["christmas camping shirt", "summer outdoor shirt", "fall hiking gift"],
  },
];

const AdminMarketResearchPanel = () => {
  const scheduleQuery = useQuery({
    queryKey: ["admin", "market-research", "schedule"],
    queryFn: getMarketResearchSchedule,
    retry: false,
  });
  const [enabled, setEnabled] = useState(false);
  const [queries, setQueries] = useState(DEFAULT_QUERIES);
  const [limitPerQuery, setLimitPerQuery] = useState("25");
  const [topN, setTopN] = useState("3");
  const [minimumViralScore, setMinimumViralScore] = useState("50");
  const [intervalMinutes, setIntervalMinutes] = useState("1440");
  const [batchSize, setBatchSize] = useState("5");
  const [runWindowMinutes, setRunWindowMinutes] = useState("120");
  const [result, setResult] = useState<MarketResearchResponse | null>(null);
  const [history, setHistory] = useState<ResearchHistoryEntry[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const retrieveMutation = useRetrieveMarketResearch();
  const saveMutation = useMutation({
    mutationFn: updateMarketResearchSchedule,
    onSuccess: (data) => {
      setEnabled(data.enabled);
      showToast("success", "Etsy schedule saved.");
      void scheduleQuery.refetch();
    },
  });

  useEffect(() => {
    const data = scheduleQuery.data;
    if (!data) return;
    setEnabled(data.enabled);
    setQueries(data.queries.join("\n"));
    setLimitPerQuery(String(data.limitPerQuery));
    setTopN(String(data.topN || 3));
    setMinimumViralScore(String(data.minimumViralScore));
    setIntervalMinutes(String(data.intervalMinutes));
    setBatchSize(String(data.batchSize || 5));
    setRunWindowMinutes(String(data.runWindowMinutes || 120));
  }, [scheduleQuery.data]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RESEARCH_HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored) as ResearchHistoryEntry[]);
    } catch {
      setHistory([]);
    }
  }, []);

  const normalizedQueries = useMemo(
    () =>
      queries
        .split(/[\n,]/)
        .map((query) => query.trim())
        .filter(Boolean)
        .filter((query, index, all) => all.indexOf(query) === index),
    [queries]
  );

  const addSuggestedNiche = (suggestedQueries: string[]) => {
    const nextQueries = [...normalizedQueries];
    suggestedQueries.forEach((query) => {
      if (!nextQueries.includes(query)) nextQueries.push(query);
    });
    setQueries(nextQueries.slice(0, MAX_QUERIES).join("\n"));
  };

  const saveSchedule = () => {
    const limit = Number(limitPerQuery);
    const top = Number(topN);
    const score = Number(minimumViralScore);
    const interval = Number(intervalMinutes);
    const batch = Number(batchSize);
    const window = Number(runWindowMinutes);
    if (enabled && !normalizedQueries.length)
      return showToast("error", "Add at least one keyword before enabling the schedule.");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      return showToast("error", "Candidates per niche must be between 1 and 100.");
    if (!Number.isInteger(top) || top < 1 || top > 25)
      return showToast("error", "Top listings must be between 1 and 25.");
    if (!Number.isFinite(score) || score < 0 || score > 100)
      return showToast("error", "Minimum score must be between 0 and 100.");
    if (!Number.isInteger(interval) || interval < 1 || interval > 10080)
      return showToast("error", "Run frequency must be between 1 and 10080 minutes.");
    if (!Number.isInteger(batch) || batch < 1 || batch > 100)
      return showToast("error", "Niches per batch must be between 1 and 100.");
    if (!Number.isInteger(window) || window < 1 || window > 43200)
      return showToast("error", "Run window must be between 1 and 43200 minutes (30 days).");
    saveMutation.mutate({
      enabled,
      platform: 1,
      queries: normalizedQueries,
      limitPerQuery: limit,
      topN: top,
      minimumViralScore: score,
      intervalMinutes: interval,
      batchSize: batch,
      runWindowMinutes: window,
    });
  };

  const saveResearchHistory = (researchQueries: string[], data: MarketResearchResponse) => {
    const previousRunNumber = Number(window.localStorage.getItem(RESEARCH_RUN_COUNTER_KEY) ?? 0);
    const runNumber =
      Number.isInteger(previousRunNumber) && previousRunNumber > 0 ? previousRunNumber + 1 : 1;
    window.localStorage.setItem(RESEARCH_RUN_COUNTER_KEY, String(runNumber));
    const entry: ResearchHistoryEntry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      runNumber,
      queries: researchQueries,
      retrievedCount: data.retrievedCount,
      selectedCount: data.selectedCount,
      averageScore: data.items.length
        ? data.items.reduce((sum, item) => sum + (Number(item.viralScore) || 0), 0) /
          data.items.length
        : 0,
      result: data,
    };
    setHistory((previous) => {
      const nextHistory = [entry, ...previous].slice(0, 5);
      window.localStorage.setItem(RESEARCH_HISTORY_KEY, JSON.stringify(nextHistory));
      return nextHistory;
    });
    setSelectedHistoryId(entry.id);
  };

  const runResearch = (researchQueries: string[]) => {
    retrieveMutation.mutate(
      {
        platform: 1,
        queries: researchQueries,
        limitPerQuery: Number(limitPerQuery),
        topN: Number(topN),
        minimumViralScore: Number(minimumViralScore),
      },
      {
        onSuccess: (data) => {
          setQueries(researchQueries.join("\n"));
          setResult(data);
          saveResearchHistory(researchQueries, data);
        },
      }
    );
  };

  const runNow = () => runResearch(normalizedQueries);

  const selectHistory = (entry: ResearchHistoryEntry) => {
    setQueries(entry.queries.join("\n"));
    setSelectedHistoryId(entry.id);
    if (entry.result) {
      setResult(entry.result);
      return;
    }
    // History written by older frontend versions contains only summary data.
    // Re-run those entries so clicking them still produces a visible snapshot.
    runResearch(entry.queries);
  };

  return (
    <section className="border-ink-200 bg-card space-y-5 rounded-xl border p-5 shadow-sm max-md:space-y-4 max-md:p-4 sm:p-6">
      <Header />
      <section className="border-ink-200 bg-card rounded-xl border p-4 max-md:p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-ink-900 flex items-center gap-2 text-sm font-bold">
              <Clock3 className="text-ink-500 size-4" /> Automatic refresh
            </p>
            <p className="text-ink-500 mt-1 text-xs">
              {enabled
                ? scheduleQuery.data?.nextRunAtUtc
                  ? `Next run ${formatDate(scheduleQuery.data.nextRunAtUtc)}`
                  : "Will run shortly after saving"
                : "Paused — use Run now for a one-off research pass"}
            </p>
          </div>
          <label className="border-ink-200 bg-card text-ink-700 flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              size="sm"
            />{" "}
            Enable schedule
          </label>
        </div>
        <div className="mt-4 grid gap-3 max-md:grid-cols-2 max-md:items-end md:grid-cols-2 xl:grid-cols-6">
          <Field label="Run frequency (minutes)">
            <Input
              type="number"
              min={1}
              max={10080}
              step={1}
              value={intervalMinutes}
              onChange={(event) => setIntervalMinutes(event.target.value)}
              className="bg-card mt-2"
            />
          </Field>
          <Field label="Candidates / keyword">
            <Input
              type="number"
              min={1}
              max={100}
              value={limitPerQuery}
              onChange={(event) => setLimitPerQuery(event.target.value)}
              className="mt-2"
            />
          </Field>
          <Field label="Top listings / niche">
            <Input
              type="number"
              min={1}
              max={25}
              value={topN}
              onChange={(event) => setTopN(event.target.value)}
              className="mt-2"
            />
          </Field>
          <Field label="Minimum trend score">
            <Input
              type="number"
              min={0}
              max={100}
              value={minimumViralScore}
              onChange={(event) => setMinimumViralScore(event.target.value)}
              className="mt-2"
            />
          </Field>
          <Field label="Niches / batch">
            <Input
              type="number"
              min={1}
              max={100}
              value={batchSize}
              onChange={(event) => setBatchSize(event.target.value)}
              className="mt-2"
            />
          </Field>
          <Field label="Run window (minutes)">
            <Input
              type="number"
              min={1}
              max={43200}
              value={runWindowMinutes}
              onChange={(event) => setRunWindowMinutes(event.target.value)}
              className="mt-2"
            />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={saveSchedule}
            disabled={saveMutation.isPending}
            className="h-10 min-w-44 max-md:w-full"
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}{" "}
            Save schedule
          </Button>
        </div>
      </section>
      <div className="space-y-3">
        <label className="text-ink-700 block text-xs font-semibold">
          Niches / keywords <span className="text-rose-500">*</span>
          <Textarea
            value={queries}
            onChange={(event) => setQueries(event.target.value)}
            className="bg-card mt-2 max-h-[418px] min-h-32 resize-y overflow-y-auto text-sm max-md:max-h-56 max-md:text-base"
            placeholder="One keyword per line, e.g. hiking shirt"
          />
          <span className="text-ink-400 mt-1 block text-[11px] font-normal">
            {normalizedQueries.length}/{MAX_QUERIES} keywords · public Etsy data only
          </span>
        </label>
        <div className="border-ink-200 bg-ink-50/60 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-ink-700 text-xs font-semibold">Suggested niches</p>
              <p className="text-ink-500 mt-1 text-[11px] font-normal">
                Start with a preset if you are not sure which keywords to research.
              </p>
            </div>
            <span className="text-ink-500 text-[10px] font-medium">Click to add keywords</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_NICHES.map((niche) => (
              <Button
                key={niche.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSuggestedNiche(niche.queries)}
                className="h-8 text-[11px]"
              >
                {niche.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* Say why the button is off, so it never looks broken. */}
          {!normalizedQueries.length && (
            <p className="text-ink-500 text-xs">Add at least one keyword above, or pick a suggested niche, to run.</p>
          )}
          <Button
            type="button"
            onClick={runNow}
            disabled={retrieveMutation.isPending || !normalizedQueries.length}
            className="h-10 min-w-44 max-md:w-full"
          >
            {retrieveMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Researching…
              </>
            ) : (
              <>
                <Play className="size-4" /> Run now
              </>
            )}
          </Button>
        </div>
      </div>
      <TooltipProvider>
        {result ? <ResearchResult result={result} /> : <ResearchEmptyState />}
        <ResearchHistory
          history={history}
          selectedId={selectedHistoryId}
          isLoading={retrieveMutation.isPending}
          onSelect={selectHistory}
        />
      </TooltipProvider>
    </section>
  );
};

type ResearchHistoryEntry = {
  id: string;
  createdAt: string;
  runNumber?: number;
  queries: string[];
  retrievedCount: number;
  selectedCount: number;
  averageScore: number;
  result?: MarketResearchResponse;
};

const ResearchHistory = ({
  history,
  selectedId,
  isLoading,
  onSelect,
}: {
  history: ResearchHistoryEntry[];
  selectedId: string | null;
  isLoading: boolean;
  onSelect: (entry: ResearchHistoryEntry) => void;
}) => (
  <div className="border-ink-100 border-t pt-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-ink-800 text-xs font-bold">Recent research history</p>
        <p className="text-ink-400 mt-1 text-[11px]">Saved locally for quick reuse by admin.</p>
      </div>
      <span className="text-ink-400 text-[10px]">{history.length}/5 runs</span>
    </div>
    {history.length ? (
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {history.map((entry, index) => {
          const runNumber = entry.runNumber ?? index + 1;
          const runLabel = `Research Run #${String(runNumber).padStart(2, "0")}`;
          const nicheLabel = entry.queries.join(" · ");
          return (
            <Tooltip key={entry.id}>
              <TooltipTrigger asChild>
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => onSelect(entry)}
                  disabled={isLoading}
                  aria-pressed={selectedId === entry.id}
                  aria-label={`${runLabel}: ${nicheLabel}`}
                  className={`hover:border-ink-400 hover:bg-ink-50 rounded-lg border p-3 text-left transition disabled:cursor-wait disabled:opacity-60 ${selectedId === entry.id ? "border-primary bg-ink-50 ring-primary/30 ring-1" : "border-ink-200 bg-card"}`}
                >
                  <p className="text-ink-700 truncate text-[11px] font-semibold">{runLabel}</p>
                  <p className="text-ink-400 mt-2 text-[10px]">{formatDate(entry.createdAt)}</p>
                  <p className="text-ink-500 mt-1 text-[10px]">
                    {entry.retrievedCount} scanned · {entry.selectedCount} selected · avg{" "}
                    {entry.averageScore.toFixed(1)}
                  </p>
                  {/* A phone has no hover, so what the tooltip says is written on the card. */}
                  <p className="text-ink-500 mt-1 line-clamp-2 text-[10px] md:hidden">
                    {entry.queries.length} niches: {nicheLabel}
                  </p>
                  <p className="text-ink-600 mt-1 text-[10px] font-medium md:hidden">
                    {entry.result ? "Tap to restore this snapshot" : "Tap to run this research again"}
                  </p>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-fit max-w-[min(28rem,calc(100vw-2rem))] min-w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 text-white shadow-xl"
              >
                <p className="text-[10px] font-semibold tracking-[0.14em] text-white/70 uppercase">
                  Niches researched ({entry.queries.length})
                </p>
                <div className="mt-2 flex max-h-48 flex-wrap content-start gap-1.5 overflow-y-auto pr-1 [scrollbar-color:#475569_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent">
                  {entry.queries.map((query) => (
                    <span
                      key={query}
                      className="max-w-full rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] leading-4 break-words text-slate-100"
                    >
                      {query}
                    </span>
                  ))}
                </div>
                <p className="mt-3 border-t border-slate-800 pt-2 text-[10px] text-white/60">
                  {entry.result
                    ? "Click to restore this snapshot"
                    : "Click to run this research again"}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    ) : (
      <p className="border-ink-200 text-ink-400 mt-3 rounded-lg border border-dashed p-3 text-[11px]">
        Your completed research runs will appear here.
      </p>
    )}
  </div>
);

const Header = () => (
  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
    <div>
      <p className="text-ink-400 text-[10px] font-bold tracking-[0.16em] uppercase">
        Etsy trend intelligence
      </p>
      <h2 className="text-ink-900 mt-1 flex items-center gap-2 text-base font-bold">
        <Sparkles className="text-ink-500 size-4" /> Public listing research
      </h2>
      <p className="text-ink-500 mt-1 max-w-2xl text-xs leading-5">
        Turn Etsy signals into searchable trend references. The schedule runs in the background;
        every selected listing is queued for RAG automatically.
      </p>
    </div>
    <Badge variant="outline" className="w-fit">Admin only</Badge>
  </div>
);
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="text-ink-700 block text-xs font-semibold">
    {label}
    {children}
  </label>
);

const ResearchResult = ({ result }: { result: MarketResearchResponse }) => {
  const items = Array.isArray(result.items) ? result.items : [];
  const avgScore = items.length
    ? items.reduce((sum, item) => sum + (Number(item.viralScore) || 0), 0) / items.length
    : 0;
  const totalFavorites = items.reduce((sum, item) => sum + (item.favorites ?? 0), 0);
  const keywordCounts = items.reduce<Record<string, number>>((counts, item) => {
    const keyword = item.matchedQuery?.trim();
    if (keyword) counts[keyword] = (counts[keyword] ?? 0) + 1;
    return counts;
  }, {});
  const topKeyword =
    Object.entries(keywordCounts).sort(([, first], [, second]) => second - first)[0]?.[0] ?? "—";
  return (
    <div className="border-ink-100 border-t pt-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-emerald-600 uppercase dark:text-emerald-400">
            Latest research snapshot
          </p>
          <h3 className="text-ink-900 mt-1 text-base font-bold">
            What Etsy is signalling right now
          </h3>
        </div>
        <p className="text-ink-500 text-xs">
          {result.selectedCount} high-signal references queued to RAG across the selected niches
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 max-md:gap-2 lg:grid-cols-5 max-md:[&>:last-child]:col-span-2">
        <Metric
          label="Listings scanned"
          value={result.retrievedCount.toLocaleString()}
          icon={<Search className="size-4" />}
        />
        <Metric
          label="Selected for RAG"
          value={result.selectedCount.toLocaleString()}
          icon={<Database className="size-4" />}
          tone="emerald"
        />
        <Metric
          label="Average trend score"
          value={avgScore.toFixed(1)}
          icon={<Sparkles className="size-4" />}
        />
        <Metric
          label="Observed favorites"
          value={formatCompact(totalFavorites)}
          icon={<Heart className="size-4" />}
        />
        <Metric
          label="Top keyword"
          value={topKeyword}
          icon={<Search className="size-4" />}
        />
      </div>
      <div className="border-ink-200 bg-card mt-4 overflow-hidden rounded-lg border">
        <ul className="divide-ink-100 divide-y md:hidden">
          {items.map((item, index) => <ResearchResultCard key={item.ragDocumentId} item={item} rank={index + 1} />)}
        </ul>
        <div className="overflow-x-auto max-md:hidden">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-ink-50 text-ink-400 text-[10px] tracking-wide uppercase">
              <tr>
                <th className="px-4 py-3">Rank / listing</th>
                <th className="px-4 py-3">Matched keyword</th>
                <th className="px-4 py-3">Trend score</th>
                <th className="px-4 py-3">Observed signals</th>
                <th className="px-4 py-3">Knowledge status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.ragDocumentId} className="border-ink-100 border-t">
                  <td className="px-4 py-3">
                    <div className="flex max-w-[280px] items-center gap-3">
                      <span className="bg-ink-100 text-ink-600 flex size-7 shrink-0 items-center justify-center rounded-full font-bold">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={item.url ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              className="text-ink-800 flex min-w-0 items-center gap-1 truncate font-semibold hover:underline"
                            >
                              <span className="truncate">{item.title}</span>
                              <ExternalLink className="size-3 shrink-0" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" className="max-w-sm">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-ink-400 text-[10px]">
                          Listing #{item.externalListingId}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="text-ink-600 px-4 py-3">{item.matchedQuery || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="w-28">
                      <div className="text-ink-700 mb-1 flex justify-between font-bold">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="border-ink-300 cursor-help border-b border-dashed">
                              {(Number(item.viralScore) || 0).toFixed(1)}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="space-y-1 text-left">
                            <p className="font-semibold">Score drivers</p>
                            <p>
                              Favorites:{" "}
                              {formatScoreDriver(
                                item.scoreBreakdown?.favoritesScore,
                                item.scoreBreakdown?.favoritesWeight
                              )}
                            </p>
                            <p>
                              Views:{" "}
                              {formatScoreDriver(
                                item.scoreBreakdown?.viewsScore,
                                item.scoreBreakdown?.viewsWeight
                              )}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-ink-400 text-[10px]">/100</span>
                      </div>
                      <Progress value={item.viralScore} className="h-1.5" />
                    </div>
                  </td>
                  <td className="text-ink-500 px-4 py-3">
                    <div className="flex gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="size-3 text-rose-400" />
                        {formatCompact(item.favorites)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3 text-sky-400" />
                        {formatCompact(item.views)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <Database className="mr-1 size-3" /> Queued
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && (
          <p className="text-ink-400 p-8 text-center text-xs">
            No listings met the minimum trend score. Lower the threshold or broaden the keywords.
          </p>
        )}
      </div>
      <p className="text-ink-400 mt-3 text-[11px] leading-5">
        Favorites and views are observed public signals, not sales claims. Use this snapshot for
        direction, keywords and structure — not for copying listing content.
      </p>
    </div>
  );
};

/** One result on a phone: the table's columns, and the score drivers its tooltip holds. */
const ResearchResultCard = ({ item, rank }: { item: MarketResearchResponse["items"][number]; rank: number }) => (
  <li className="text-ink-500 space-y-2 p-3 text-[11px]">
    <div className="flex items-start gap-2">
      <span className="bg-ink-100 text-ink-600 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <a href={item.url ?? undefined} target="_blank" rel="noreferrer" className="text-ink-800 line-clamp-2 text-xs font-semibold">
          {item.title}
        </a>
        <span className="text-ink-400 text-[10px]">Listing #{item.externalListingId}</span>
      </div>
      <Badge className="shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
        <Database className="mr-1 size-3" /> Queued
      </Badge>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-ink-700 font-bold tabular-nums">{(Number(item.viralScore) || 0).toFixed(1)}</span>
      <span className="text-ink-400 text-[10px]">/100</span>
      <Progress value={item.viralScore} className="h-1.5 flex-1" />
    </div>
    <p>
      Favorites: {formatScoreDriver(item.scoreBreakdown?.favoritesScore, item.scoreBreakdown?.favoritesWeight)}
      <br />
      Views: {formatScoreDriver(item.scoreBreakdown?.viewsScore, item.scoreBreakdown?.viewsWeight)}
    </p>
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 truncate">{item.matchedQuery || "—"}</span>
      <span className="flex shrink-0 gap-3">
        <span className="inline-flex items-center gap-1"><Heart className="size-3 text-rose-400" />{formatCompact(item.favorites)}</span>
        <span className="inline-flex items-center gap-1"><Eye className="size-3 text-sky-400" />{formatCompact(item.views)}</span>
      </span>
    </div>
  </li>
);

const ResearchEmptyState = () => (
  <div className="border-ink-100 border-t pt-5">
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
      <div>
        <p className="text-ink-400 text-[10px] font-bold tracking-[0.16em] uppercase">
          Research insights
        </p>
        <h3 className="text-ink-900 mt-1 text-base font-bold">
          Your latest snapshot will appear here
        </h3>
      </div>
      <p className="text-ink-400 text-xs">Run a research pass to populate the metrics</p>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 max-md:gap-2 lg:grid-cols-5 max-md:[&>:last-child]:col-span-2">
      <Metric label="Listings scanned" value="—" icon={<Search className="size-4" />} />
      <Metric
        label="Selected for RAG"
        value="—"
        icon={<Database className="size-4" />}
        tone="emerald"
      />
      <Metric
        label="Average trend score"
        value="—"
        icon={<Sparkles className="size-4" />}
      />
      <Metric label="Observed favorites" value="—" icon={<Heart className="size-4" />} />
      <Metric label="Top keyword" value="—" icon={<Search className="size-4" />} />
    </div>
  </div>
);

const Metric = ({
  label,
  value,
  icon,
  tone = "slate",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: string;
}) => (
  <div className="border-ink-100 bg-card rounded-lg border p-3">
    <div
      className={`mb-2 flex size-7 items-center justify-center rounded-md ${tone === "emerald" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-ink-100 text-ink-500"}`}
    >
      {icon}
    </div>
    <p className="text-ink-400 text-[10px] font-semibold tracking-wide uppercase">{label}</p>
    <p className="text-ink-900 mt-1 text-lg font-bold">{value}</p>
  </div>
);
const formatCompact = (value: number | null) =>
  value == null
    ? "—"
    : Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
const formatScoreDriver = (score: number | null | undefined, weight: number | undefined) =>
  score == null
    ? "Unavailable"
    : `${score.toFixed(1)}/100 · ${Math.round((weight ?? 0) * 100)}% weight`;
const formatDate = (value: string) =>
  new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

export { AdminMarketResearchPanel };
