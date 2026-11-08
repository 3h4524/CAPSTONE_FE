"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, Play, RotateCcw, Target } from "lucide-react";

import {
  type RagEvaluationCaseResult,
  type RagKnownItemBenchmarkResponse,
  runKnownItemBenchmark,
} from "@/api/rag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/helpers/toast";

type Scores = { cases: number; mrr: number; hit1: number; hit5: number; hit10: number };

type HistoryEntry = Scores & {
  caseSetId: string;
  seed: number;
  sampleSize: number;
  runAt: string;
};

const HISTORY_KEY = "rag-known-item-benchmark-history";
const HISTORY_LIMIT = 12;
const SAMPLE_SIZES = [10, 20, 40];
const CATEGORY_LABELS: Record<string, string> = {
  "known-item-short": "Short query",
  "known-item-long": "Long query",
};

const score = (cases: RagEvaluationCaseResult[]): Scores => {
  const count = cases.length || 1;
  const hit = (k: number) => (cases.filter((item) => item.matchedRank != null && item.matchedRank <= k).length * 100) / count;
  return {
    cases: cases.length,
    mrr: cases.reduce((sum, item) => sum + (item.matchedRank ? 1 / item.matchedRank : 0), 0) / count,
    hit1: hit(1),
    hit5: hit(5),
    hit10: hit(10),
  };
};

// The history is a per-browser convenience for comparing runs; storage can be unavailable.
const readHistory = (): HistoryEntry[] => {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
};

const writeHistory = (entries: HistoryEntry[]) => {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    // Ignore: the benchmark still works without a saved history.
  }
};

export const RagKnownItemBenchmark = () => {
  const [sampleSize, setSampleSize] = useState(20);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<RagKnownItemBenchmarkResponse | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);

  useEffect(() => setHistory(readHistory()), []);

  const lastCaseSetId = result?.caseSetId ?? history[0]?.caseSetId ?? null;
  const scores = useMemo(() => (result ? score(result.evaluation.cases) : null), [result]);
  const byCategory = useMemo(() => {
    if (!result) return [];
    return Object.keys(CATEGORY_LABELS).map((category) => ({
      category,
      ...score(result.evaluation.cases.filter((item) => item.category === category)),
    }));
  }, [result]);
  // The previous run of the same case set is the only fair comparison: same questions, same answers.
  const previous = useMemo(
    () => (result ? history.find((entry) => entry.caseSetId === result.caseSetId && entry.runAt !== result.evaluation.completedAt) : undefined),
    [history, result]
  );

  const run = async (caseSetId?: string) => {
    setIsRunning(true);
    setOpenCaseId(null);
    try {
      const response = await runKnownItemBenchmark(caseSetId ? { caseSetId } : { sampleSize });
      const runScores = score(response.evaluation.cases);
      const entry: HistoryEntry = {
        ...runScores,
        caseSetId: response.caseSetId,
        seed: response.seed,
        sampleSize: response.sampleSize,
        runAt: response.evaluation.completedAt,
      };
      const nextHistory = [entry, ...readHistory()];
      writeHistory(nextHistory);
      setHistory(nextHistory.slice(0, HISTORY_LIMIT));
      setResult(response);
      showToast("success", response.reusedCaseSet ? "Case set run again." : "New case set created and scored.");
    } catch {
      showToast("error", caseSetId
        ? "The case set could not be run. It may have expired; create a new one."
        : "The benchmark failed. Check that ready listing documents exist and the RAG configuration.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-indigo-100 dark:border-indigo-500/30 bg-card shadow-sm">
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Target className="size-4" />
              </span>
              Known-item benchmark
            </CardTitle>
            <CardDescription className="mt-1 max-w-3xl text-xs leading-5">
              Each case is a query written from one ready listing&apos;s niche, tags and description, so that listing is the
              correct answer. A short query mirrors a seller search; a long one mirrors the listing generator. Run the same
              case set again after a retrieval change to see its effect.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit border-indigo-200 dark:border-indigo-500/30 text-[10px] text-indigo-700 dark:text-indigo-300">
            Read only
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-ink-600">
            Listings
            <select
              value={sampleSize}
              onChange={(event) => setSampleSize(Number(event.target.value))}
              className="h-9 rounded-md border border-ink-200 bg-card px-2 text-xs font-medium text-ink-700 shadow-sm outline-none focus:border-indigo-400"
            >
              {SAMPLE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} ({size * 2} cases)
                </option>
              ))}
            </select>
          </label>
          <Button type="button" size="sm" onClick={() => run()} disabled={isRunning}>
            <Play className="size-3.5" /> {isRunning ? "Running..." : "New case set"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => lastCaseSetId && run(lastCaseSetId)}
            disabled={isRunning || !lastCaseSetId}
          >
            <RotateCcw className="size-3.5" /> Run last case set again
          </Button>
          <p className="text-[11px] text-ink-400">A new set takes about a minute; a re-run is faster.</p>
        </div>

        {result && scores ? (
          <>
            <p className="text-[11px] text-ink-500">
              Case set <span className="font-mono text-ink-700">{result.caseSetId.slice(0, 8)}</span> · seed {result.seed} ·{" "}
              {result.sampleSize} listings · created {new Date(result.caseSetCreatedAt).toLocaleString()} · top {result.topK}
              {result.reusedCaseSet ? " · re-run" : ""}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <ScoreTile label="MRR" value={scores.mrr.toFixed(3)} delta={previous ? scores.mrr - previous.mrr : null} digits={3}
                hint="Average of 1 / rank of the correct listing" />
              <ScoreTile label="Hit@1" value={`${scores.hit1.toFixed(1)}%`} delta={previous ? scores.hit1 - previous.hit1 : null}
                hint="Correct listing ranked first" />
              <ScoreTile label="Hit@5" value={`${scores.hit5.toFixed(1)}%`} delta={previous ? scores.hit5 - previous.hit5 : null}
                hint="Correct listing in the top 5" />
              <ScoreTile label="Hit@10" value={`${scores.hit10.toFixed(1)}%`} delta={previous ? scores.hit10 - previous.hit10 : null}
                hint="Correct listing in the top 10" />
              <ScoreTile label="Avg latency" value={`${Math.round(result.evaluation.averageLatencyMs)} ms`} delta={null}
                hint="Per search, embedding included" />
            </div>
            {!previous && (
              <p className="text-[11px] text-ink-400">Run this case set again after a change to see the difference here.</p>
            )}

            <div className="overflow-x-auto rounded-lg border border-ink-100">
              <table className="w-full min-w-[28rem] text-left text-xs">
                <thead className="bg-ink-50 text-[10px] tracking-[0.08em] text-ink-400 uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Query type</th>
                    <th className="px-3 py-2 font-semibold">Cases</th>
                    <th className="px-3 py-2 font-semibold">MRR</th>
                    <th className="px-3 py-2 font-semibold">Hit@1</th>
                    <th className="px-3 py-2 font-semibold">Hit@5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {byCategory.map((row) => (
                    <tr key={row.category}>
                      <td className="px-3 py-2 font-medium text-ink-800">{CATEGORY_LABELS[row.category]}</td>
                      <td className="px-3 py-2 text-ink-600 tabular-nums">{row.cases}</td>
                      <td className="px-3 py-2 text-ink-800 tabular-nums">{row.mrr.toFixed(3)}</td>
                      <td className="px-3 py-2 text-ink-800 tabular-nums">{row.hit1.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-ink-800 tabular-nums">{row.hit5.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="text-[10px] font-bold tracking-[0.12em] text-ink-500 uppercase">Cases</p>
              <p className="mt-0.5 text-[11px] text-ink-400">
                A miss on a very generic short query is often a near-duplicate listing ranked first, not a wrong result.
              </p>
              <div className="mt-2 max-h-[28rem] overflow-auto rounded-lg border border-ink-100">
                <table className="w-full min-w-[40rem] text-left text-xs">
                  <thead className="sticky top-0 bg-ink-50 text-[10px] tracking-[0.08em] text-ink-400 uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Rank</th>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Query</th>
                      <th className="px-3 py-2 font-semibold">Top result</th>
                      <th className="w-8 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {[...result.evaluation.cases]
                      .sort((a, b) => (b.matchedRank ?? 99) - (a.matchedRank ?? 99))
                      .map((item) => (
                        <CaseRow
                          key={item.id}
                          item={item}
                          isOpen={openCaseId === item.id}
                          onToggle={() => setOpenCaseId((current) => (current === item.id ? null : item.id))}
                        />
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          !isRunning && (
            <p className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-4 text-xs leading-5 text-ink-500">
              No benchmark run yet. Create a case set to score retrieval: MRR is the average of 1 / rank of the correct
              listing (1.0 when it is always first), and Hit@k is the share of cases with the correct listing in the top k.
            </p>
          )
        )}

        {history.length > 0 && (
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-ink-500 uppercase">Recent runs in this browser</p>
            <div className="mt-2 overflow-x-auto rounded-lg border border-ink-100">
              <table className="w-full min-w-[32rem] text-left text-xs">
                <thead className="bg-ink-50 text-[10px] tracking-[0.08em] text-ink-400 uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Run at</th>
                    <th className="px-3 py-2 font-semibold">Case set</th>
                    <th className="px-3 py-2 font-semibold">Cases</th>
                    <th className="px-3 py-2 font-semibold">MRR</th>
                    <th className="px-3 py-2 font-semibold">Hit@5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {history.map((entry) => (
                    <tr key={`${entry.caseSetId}-${entry.runAt}`}>
                      <td className="px-3 py-2 text-ink-600">{new Date(entry.runAt).toLocaleString()}</td>
                      <td className="px-3 py-2 font-mono text-ink-700">{entry.caseSetId.slice(0, 8)}</td>
                      <td className="px-3 py-2 text-ink-600 tabular-nums">{entry.cases}</td>
                      <td className="px-3 py-2 text-ink-800 tabular-nums">{entry.mrr.toFixed(3)}</td>
                      <td className="px-3 py-2 text-ink-800 tabular-nums">{entry.hit5.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ScoreTile = ({
  label,
  value,
  delta,
  digits = 1,
  hint,
}: {
  label: string;
  value: string;
  delta: number | null;
  digits?: number;
  hint: string;
}) => (
  <div className="rounded-xl border border-ink-100 bg-ink-50/60 px-4 py-3">
    <p className="text-[10px] font-bold tracking-[0.12em] text-ink-400 uppercase">{label}</p>
    <div className="mt-1 flex items-baseline gap-2">
      <p className="text-xl font-bold text-ink-900 tabular-nums">{value}</p>
      {delta != null && Math.abs(delta) >= 10 ** -digits && (
        <span className={`text-xs font-semibold tabular-nums ${delta > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
          {delta > 0 ? "+" : ""}
          {delta.toFixed(digits)}
        </span>
      )}
    </div>
    <p className="mt-0.5 text-[10px] text-ink-500">{hint}</p>
  </div>
);

const RankBadge = ({ rank }: { rank: number | null | undefined }) => {
  if (rank == null) return <Badge className="border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300">Missed</Badge>;
  const tone =
    rank === 1
      ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : rank <= 5
        ? "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return <Badge className={tone}>#{rank}</Badge>;
};

const CaseRow = ({
  item,
  isOpen,
  onToggle,
}: {
  item: RagEvaluationCaseResult;
  isOpen: boolean;
  onToggle: () => void;
}) => {
  const expectedSourceId = item.id.replace(/#(short|long)$/, "");
  const top = item.results[0]?.result;
  return (
    <Fragment>
      <tr className="cursor-pointer hover:bg-ink-50/80" onClick={onToggle}>
        <td className="px-3 py-2">
          <RankBadge rank={item.matchedRank} />
        </td>
        <td className="px-3 py-2 whitespace-nowrap text-ink-600">{CATEGORY_LABELS[item.category] ?? item.category}</td>
        <td className="max-w-72 truncate px-3 py-2 text-ink-800" title={item.query}>
          {item.query}
        </td>
        <td className="max-w-64 truncate px-3 py-2 text-ink-600" title={top?.title}>
          {top?.title ?? "—"}
        </td>
        <td className="px-3 py-2">
          <ChevronDown className={`size-3.5 text-ink-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-ink-50/60">
          <td colSpan={5} className="px-3 py-3">
            <p className="text-[11px] text-ink-500">
              Expected listing <span className="font-mono text-ink-700">{expectedSourceId}</span>
            </p>
            <ol className="mt-2 space-y-1">
              {item.results.map((entry, index) => {
                const isExpected = entry.result.sourceId === expectedSourceId;
                return (
                  <li
                    key={entry.result.chunkId}
                    className={`flex items-center gap-3 rounded-md px-2 py-1 ${isExpected ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : "text-ink-700"}`}
                  >
                    <span className="w-6 text-right text-[11px] text-ink-400 tabular-nums">#{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate" title={entry.result.title}>
                      {entry.result.title}
                    </span>
                    <span className="text-[11px] text-ink-500 tabular-nums">
                      final {entry.finalScore.toFixed(3)} · semantic {entry.semanticScore.toFixed(3)} · lexical{" "}
                      {entry.lexicalScore.toFixed(2)}
                    </span>
                    {isExpected && <span className="text-[11px] font-semibold">Expected</span>}
                  </li>
                );
              })}
            </ol>
          </td>
        </tr>
      )}
    </Fragment>
  );
};
