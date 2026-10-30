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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useRetrieveMarketResearch } from "@/hooks/mutations/use-retrieve-market-research";
import { useQuery } from "@/hooks/queries/use-query";

const DEFAULT_QUERIES = "hiking shirt\nmountain gift\ncamping t shirt";
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
    setQueries(nextQueries.slice(0, 20).join("\n"));
  };

  const saveSchedule = () => {
    const limit = Number(limitPerQuery);
    const top = Number(topN);
    const score = Number(minimumViralScore);
    const interval = Number(intervalMinutes);
    if (enabled && !normalizedQueries.length)
      return showToast("error", "Add at least one keyword before enabling the schedule.");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      return showToast("error", "Candidates per niche must be between 1 and 100.");
    if (!Number.isInteger(top) || top < 1 || top > 25)
      return showToast("error", "Top listings must be between 1 and 25.");
    if (!Number.isFinite(score) || score < 0 || score > 100)
      return showToast("error", "Minimum score must be between 0 and 100.");
    saveMutation.mutate({
      enabled,
      platform: 1,
      queries: normalizedQueries,
      limitPerQuery: limit,
      topN: top,
      minimumViralScore: score,
      intervalMinutes: interval,
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
    <section className="space-y-5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-white p-5 shadow-sm sm:p-6">
      <Header />
      <section className="rounded-xl border border-indigo-100 bg-white/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock3 className="size-4 text-indigo-500" /> Automatic refresh
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {enabled
                ? scheduleQuery.data?.nextRunAtUtc
                  ? `Next run ${formatDate(scheduleQuery.data.nextRunAtUtc)}`
                  : "Will run shortly after saving"
                : "Paused — use Run now for a one-off research pass"}
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              size="sm"
              className="data-[state=checked]:bg-indigo-500"
            />{" "}
            Enable schedule
          </label>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Run frequency">
            <Select value={intervalMinutes} onValueChange={setIntervalMinutes}>
              <SelectTrigger className="mt-2 w-full bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="60">Every hour</SelectItem>
                <SelectItem value="360">Every 6 hours</SelectItem>
                <SelectItem value="720">Every 12 hours</SelectItem>
                <SelectItem value="1440">Every day</SelectItem>
                <SelectItem value="10080">Every week</SelectItem>
              </SelectContent>
            </Select>
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
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={saveSchedule}
            disabled={saveMutation.isPending}
            className="h-10 min-w-44"
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
        <label className="block text-xs font-semibold text-slate-700">
          Niches / keywords <span className="text-rose-500">*</span>
          <Textarea
            value={queries}
            onChange={(event) => setQueries(event.target.value)}
            className="mt-2 min-h-32 resize-y bg-white text-sm"
            placeholder="One keyword per line, e.g. hiking shirt"
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-400">
            {normalizedQueries.length}/20 keywords · public Etsy data only
          </span>
        </label>
        <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-slate-700">Suggested niches</p>
              <p className="mt-1 text-[11px] font-normal text-slate-500">
                Start with a preset if you are not sure which keywords to research.
              </p>
            </div>
            <span className="text-[10px] font-medium text-indigo-500">Click to add keywords</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUGGESTED_NICHES.map((niche) => (
              <Button
                key={niche.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addSuggestedNiche(niche.queries)}
                className="h-8 border-indigo-200 bg-white text-[11px] text-indigo-700 hover:bg-indigo-100"
              >
                {niche.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={runNow}
            disabled={retrieveMutation.isPending || !normalizedQueries.length}
            className="h-10 min-w-44"
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
  <div className="border-t border-indigo-100 pt-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold text-slate-800">Recent research history</p>
        <p className="mt-1 text-[11px] text-slate-400">Saved locally for quick reuse by admin.</p>
      </div>
      <span className="text-[10px] text-slate-400">{history.length}/5 runs</span>
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
                  className={`rounded-lg border p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/40 disabled:cursor-wait disabled:opacity-60 ${selectedId === entry.id ? "border-indigo-400 bg-indigo-50/70 ring-1 ring-indigo-200" : "border-slate-200 bg-white"}`}
                >
                  <p className="truncate text-[11px] font-semibold text-slate-700">{runLabel}</p>
                  <p className="mt-2 text-[10px] text-slate-400">{formatDate(entry.createdAt)}</p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    {entry.retrievedCount} scanned · {entry.selectedCount} selected · avg{" "}
                    {entry.averageScore.toFixed(1)}
                  </p>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                sideOffset={8}
                className="w-fit min-w-64 max-w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-slate-700 bg-slate-950 p-3 text-white shadow-xl"
              >
                <p className="text-[10px] font-semibold tracking-[0.14em] text-indigo-300 uppercase">
                  Niches researched ({entry.queries.length})
                </p>
                <div className="mt-2 flex max-h-48 flex-wrap content-start gap-1.5 overflow-y-auto pr-1 [scrollbar-color:#475569_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-track]:bg-transparent">
                  {entry.queries.map((query) => (
                    <span
                      key={query}
                      className="max-w-full rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] leading-4 text-slate-100 break-words"
                    >
                      {query}
                    </span>
                  ))}
                </div>
                <p className="mt-3 border-t border-slate-800 pt-2 text-[10px] text-slate-400">
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
      <p className="mt-3 rounded-lg border border-dashed border-slate-200 p-3 text-[11px] text-slate-400">
        Your completed research runs will appear here.
      </p>
    )}
  </div>
);

const Header = () => (
  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
    <div>
      <p className="text-[10px] font-bold tracking-[0.16em] text-indigo-500 uppercase">
        Etsy trend intelligence
      </p>
      <h2 className="mt-1 flex items-center gap-2 text-base font-bold text-slate-900">
        <Sparkles className="size-4 text-indigo-500" /> Public listing research
      </h2>
      <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
        Turn Etsy signals into searchable trend references. The schedule runs in the background;
        every selected listing is queued for RAG automatically.
      </p>
    </div>
    <Badge className="w-fit border-indigo-100 bg-white text-indigo-600">Admin only</Badge>
  </div>
);
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="block text-xs font-semibold text-slate-700">
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
    <div className="border-t border-indigo-100 pt-5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-emerald-600 uppercase">
            Latest research snapshot
          </p>
          <h3 className="mt-1 text-base font-bold text-slate-900">
            What Etsy is signalling right now
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          {result.selectedCount} high-signal references queued to RAG across the selected niches
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
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
          tone="indigo"
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
          tone="indigo"
        />
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-slate-50 text-[10px] tracking-wide text-slate-400 uppercase">
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
                <tr key={item.ragDocumentId} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="flex max-w-[280px] items-center gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={item.url ?? undefined}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-w-0 items-center gap-1 truncate font-semibold text-slate-800 hover:text-indigo-600"
                            >
                              <span className="truncate">{item.title}</span>
                              <ExternalLink className="size-3 shrink-0" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" className="max-w-sm">
                            {item.title}
                          </TooltipContent>
                        </Tooltip>
                        <span className="text-[10px] text-slate-400">
                          Listing #{item.externalListingId}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.matchedQuery || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="w-28">
                      <div className="mb-1 flex justify-between font-bold text-slate-700">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help border-b border-dashed border-slate-300">
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
                        <span className="text-[10px] text-slate-400">/100</span>
                      </div>
                      <Progress value={item.viralScore} className="h-1.5" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
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
                    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                      <Database className="mr-1 size-3" /> Queued
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length && (
          <p className="p-8 text-center text-xs text-slate-400">
            No listings met the minimum trend score. Lower the threshold or broaden the keywords.
          </p>
        )}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-slate-400">
        Favorites and views are observed public signals, not sales claims. Use this snapshot for
        direction, keywords and structure — not for copying listing content.
      </p>
    </div>
  );
};

const ResearchEmptyState = () => (
  <div className="border-t border-indigo-100 pt-5">
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
      <div>
        <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">
          Research insights
        </p>
        <h3 className="mt-1 text-base font-bold text-slate-900">
          Your latest snapshot will appear here
        </h3>
      </div>
      <p className="text-xs text-slate-400">Run a research pass to populate the metrics</p>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
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
        tone="indigo"
      />
      <Metric label="Observed favorites" value="—" icon={<Heart className="size-4" />} />
      <Metric label="Top keyword" value="—" icon={<Search className="size-4" />} tone="indigo" />
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
  <div className="rounded-lg border border-slate-100 bg-white p-3">
    <div
      className={`mb-2 flex size-7 items-center justify-center rounded-md ${tone === "emerald" ? "bg-emerald-50 text-emerald-600" : tone === "indigo" ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-500"}`}
    >
      {icon}
    </div>
    <p className="text-[10px] font-semibold tracking-wide text-slate-400 uppercase">{label}</p>
    <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
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
