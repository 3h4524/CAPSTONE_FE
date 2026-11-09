"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, Play, RotateCcw, Target } from "lucide-react";

import {
  type RagEvaluationCaseResult,
  type RagKnownItemBenchmarkResponse,
  runKnownItemBenchmark,
} from "@/api/rag";
import { RagCardAbout } from "@/components/admin/rag-card-about";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/helpers/toast";
import { useIsPhone } from "@/hooks/use-is-phone";

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
// A phone starts with the weakest few cases, which is where a run needs looking at.
const PHONE_CASES = 5;
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
  const [showsAllCases, setShowsAllCases] = useState(false);
  const isPhone = useIsPhone();

  useEffect(() => setHistory(readHistory()), []);

  const lastCaseSetId = result?.caseSetId ?? history[0]?.caseSetId ?? null;
  const sortedCases = useMemo(
    () => (result ? [...result.evaluation.cases].sort((a, b) => (b.matchedRank ?? 99) - (a.matchedRank ?? 99)) : []),
    [result]
  );
  const phoneCases = showsAllCases ? sortedCases : sortedCases.slice(0, PHONE_CASES);
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
    <Card className="bg-card border-indigo-100 shadow-sm dark:border-indigo-500/30">
      <CardHeader className="max-md:px-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Target className="size-4" />
              </span>
              Known-item benchmark
            </CardTitle>
            <RagCardAbout>
              Each case is a query written from one ready listing&apos;s niche, tags and description, so that listing is the
              correct answer. A short query mirrors a seller search; a long one mirrors the listing generator. Run the same
              case set again after a retrieval change to see its effect.
              <span className="md:hidden"> MRR is the average of 1 / rank of the correct
              listing (1.0 when it is always first), and Hit@k is the share of cases with the correct listing in the top k.</span>
            </RagCardAbout>
          </div>
          <Badge variant="outline" className="w-fit border-indigo-200 text-[10px] text-indigo-700 dark:border-indigo-500/30 dark:text-indigo-300">
            Read only
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-md:px-4">
        <div className="flex flex-wrap items-center gap-2 max-md:grid max-md:grid-cols-2">
          <label className="text-ink-600 flex items-center gap-2 text-xs max-md:col-span-2 max-md:justify-between">
            Listings
            <select
              value={sampleSize}
              onChange={(event) => setSampleSize(Number(event.target.value))}
              className="border-ink-200 bg-card text-ink-700 h-9 rounded-md border px-2 text-xs font-medium shadow-sm outline-none focus:border-indigo-400 max-md:h-11 max-md:text-base"
            >
              {SAMPLE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} ({size * 2} cases)
                </option>
              ))}
            </select>
          </label>
          <Button type="button" size="sm" className="max-md:min-h-10 max-md:px-2" onClick={() => run()} disabled={isRunning}>
            <Play className="size-3.5" /> {isRunning ? "Running..." : "New case set"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="max-md:min-h-10 max-md:px-2"
            onClick={() => lastCaseSetId && run(lastCaseSetId)}
            disabled={isRunning || !lastCaseSetId}
          >
            <RotateCcw className="size-3.5" /> <span className="max-md:hidden">Run last case set again</span><span className="md:hidden">Run last set</span>
          </Button>
          <p className="text-ink-400 text-[11px] max-md:col-span-2 max-md:text-center">A new set takes about a minute; a re-run is faster.</p>
        </div>

        {result && scores ? (
          <>
            <p className="text-ink-500 text-[11px]">
              Case set <span className="text-ink-700 font-mono">{result.caseSetId.slice(0, 8)}</span> · seed {result.seed} ·{" "}
              {result.sampleSize} listings · created {new Date(result.caseSetCreatedAt).toLocaleString()} · top {result.topK}
              {result.reusedCaseSet ? " · re-run" : ""}
            </p>
            <div className="grid gap-3 max-md:grid-cols-2 max-md:gap-2 sm:grid-cols-2 xl:grid-cols-5 max-md:[&>:last-child]:col-span-2">
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
              <p className="text-ink-400 text-[11px]">Run this case set again after a change to see the difference here.</p>
            )}

            <ul className="divide-ink-100 border-ink-100 divide-y rounded-lg border md:hidden">
              {byCategory.map((row) => (
                <li key={row.category} className="space-y-2 p-3 text-xs">
                  <p className="flex items-center justify-between gap-2">
                    <span className="text-ink-800 font-medium">{CATEGORY_LABELS[row.category]}</span>
                    <span className="text-ink-500 text-[11px] tabular-nums">{row.cases} cases</span>
                  </p>
                  <PhoneFigures figures={[["MRR", row.mrr.toFixed(3)], ["Hit@1", `${row.hit1.toFixed(1)}%`], ["Hit@5", `${row.hit5.toFixed(1)}%`]]} />
                </li>
              ))}
            </ul>
            <div className="border-ink-100 overflow-x-auto rounded-lg border max-md:hidden">
              <table className="w-full min-w-[28rem] text-left text-xs">
                <thead className="bg-ink-50 text-ink-400 text-[10px] tracking-[0.08em] uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Query type</th>
                    <th className="px-3 py-2 font-semibold">Cases</th>
                    <th className="px-3 py-2 font-semibold">MRR</th>
                    <th className="px-3 py-2 font-semibold">Hit@1</th>
                    <th className="px-3 py-2 font-semibold">Hit@5</th>
                  </tr>
                </thead>
                <tbody className="divide-ink-100 divide-y">
                  {byCategory.map((row) => (
                    <tr key={row.category}>
                      <td className="text-ink-800 px-3 py-2 font-medium">{CATEGORY_LABELS[row.category]}</td>
                      <td className="text-ink-600 px-3 py-2 tabular-nums">{row.cases}</td>
                      <td className="text-ink-800 px-3 py-2 tabular-nums">{row.mrr.toFixed(3)}</td>
                      <td className="text-ink-800 px-3 py-2 tabular-nums">{row.hit1.toFixed(1)}%</td>
                      <td className="text-ink-800 px-3 py-2 tabular-nums">{row.hit5.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <p className="text-ink-500 text-[10px] font-bold tracking-[0.12em] uppercase">Cases</p>
              <p className="text-ink-400 mt-0.5 text-[11px]">
                A miss on a very generic short query is often a near-duplicate listing ranked first, not a wrong result.
              </p>
              {isPhone ? (
                <>
                  <ul className="divide-ink-100 border-ink-100 mt-2 divide-y rounded-lg border">
                    {phoneCases.map((item) => (
                      <PhoneCaseItem
                        key={item.id}
                        item={item}
                        isOpen={openCaseId === item.id}
                        onToggle={() => setOpenCaseId((current) => (current === item.id ? null : item.id))}
                      />
                    ))}
                  </ul>
                  {sortedCases.length > PHONE_CASES && (
                    <button
                      type="button"
                      className="mt-1 min-h-10 w-full text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                      onClick={() => setShowsAllCases((value) => !value)}
                    >
                      {showsAllCases ? "Show fewer" : `Show all ${sortedCases.length}`}
                    </button>
                  )}
                </>
              ) : (
              <div className="border-ink-100 mt-2 max-h-[28rem] overflow-auto rounded-lg border">
                <table className="w-full min-w-[40rem] text-left text-xs">
                  <thead className="bg-ink-50 text-ink-400 sticky top-0 text-[10px] tracking-[0.08em] uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Rank</th>
                      <th className="px-3 py-2 font-semibold">Type</th>
                      <th className="px-3 py-2 font-semibold">Query</th>
                      <th className="px-3 py-2 font-semibold">Top result</th>
                      <th className="w-8 px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-ink-100 divide-y">
                    {sortedCases.map((item) => (
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
              )}
            </div>
          </>
        ) : (
          !isRunning && (
            <p className="border-ink-200 bg-ink-50/60 text-ink-500 rounded-xl border border-dashed p-4 text-xs leading-5">
              No benchmark run yet. Create a case set to score retrieval<span className="max-md:hidden">: MRR is the average of 1 / rank of the correct
              listing (1.0 when it is always first), and Hit@k is the share of cases with the correct listing in the top k.</span>
              <span className="md:hidden">.</span>
            </p>
          )
        )}

        {history.length > 0 && (
          <div>
            <p className="text-ink-500 text-[10px] font-bold tracking-[0.12em] uppercase">Recent runs in this browser</p>
            <ul className="divide-ink-100 border-ink-100 mt-2 divide-y rounded-lg border md:hidden">
              {history.map((entry) => (
                <li key={`${entry.caseSetId}-${entry.runAt}`} className="space-y-2 p-3 text-xs">
                  <p className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-ink-600">{new Date(entry.runAt).toLocaleString()}</span>
                    <span className="text-ink-700 font-mono">{entry.caseSetId.slice(0, 8)}</span>
                  </p>
                  <PhoneFigures figures={[["Cases", String(entry.cases)], ["MRR", entry.mrr.toFixed(3)], ["Hit@5", `${entry.hit5.toFixed(1)}%`]]} />
                </li>
              ))}
            </ul>
            <div className="border-ink-100 mt-2 overflow-x-auto rounded-lg border max-md:hidden">
              <table className="w-full min-w-[32rem] text-left text-xs">
                <thead className="bg-ink-50 text-ink-400 text-[10px] tracking-[0.08em] uppercase">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Run at</th>
                    <th className="px-3 py-2 font-semibold">Case set</th>
                    <th className="px-3 py-2 font-semibold">Cases</th>
                    <th className="px-3 py-2 font-semibold">MRR</th>
                    <th className="px-3 py-2 font-semibold">Hit@5</th>
                  </tr>
                </thead>
                <tbody className="divide-ink-100 divide-y">
                  {history.map((entry) => (
                    <tr key={`${entry.caseSetId}-${entry.runAt}`}>
                      <td className="text-ink-600 px-3 py-2">{new Date(entry.runAt).toLocaleString()}</td>
                      <td className="text-ink-700 px-3 py-2 font-mono">{entry.caseSetId.slice(0, 8)}</td>
                      <td className="text-ink-600 px-3 py-2 tabular-nums">{entry.cases}</td>
                      <td className="text-ink-800 px-3 py-2 tabular-nums">{entry.mrr.toFixed(3)}</td>
                      <td className="text-ink-800 px-3 py-2 tabular-nums">{entry.hit5.toFixed(1)}%</td>
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
  <div className="border-ink-100 bg-ink-50/60 rounded-xl border px-4 py-3 max-md:px-3">
    <p className="text-ink-400 text-[10px] font-bold tracking-[0.12em] uppercase">{label}</p>
    <div className="mt-1 flex items-baseline gap-2">
      <p className="text-ink-900 text-xl font-bold tabular-nums">{value}</p>
      {delta != null && Math.abs(delta) >= 10 ** -digits && (
        <span className={`text-xs font-semibold tabular-nums ${delta > 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
          {delta > 0 ? "+" : ""}
          {delta.toFixed(digits)}
        </span>
      )}
    </div>
    <p className="text-ink-500 mt-0.5 text-[10px]">{hint}</p>
  </div>
);

/** Three figures in a row, for a phone, where the table's columns do not fit. */
const PhoneFigures = ({ figures }: { figures: [label: string, value: string][] }) => (
  <dl className="grid grid-cols-3 gap-2">
    {figures.map(([label, value]) => (
      <div key={label}>
        <dt className="text-ink-400 text-[10px] tracking-[0.08em] uppercase">{label}</dt>
        <dd className="text-ink-800 mt-0.5 tabular-nums">{value}</dd>
      </div>
    ))}
  </dl>
);

const RankBadge = ({ rank }: { rank: number | null | undefined }) => {
  if (rank == null) return <Badge className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">Missed</Badge>;
  const tone =
    rank === 1
      ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : rank <= 5
        ? "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"
        : "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300";
  return <Badge className={tone}>#{rank}</Badge>;
};

/** A case on a phone: the table row's cells stacked, and the ranking it opens below them. */
const PhoneCaseItem = ({
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
    <li className="text-xs">
      <button type="button" aria-expanded={isOpen} onClick={onToggle} className="w-full space-y-1.5 p-3 text-left">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <RankBadge rank={item.matchedRank} />
            <span className="text-ink-600 text-[11px]">{CATEGORY_LABELS[item.category] ?? item.category}</span>
          </span>
          <ChevronDown className={`text-ink-400 size-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
        <span className="text-ink-800 line-clamp-2">{item.query}</span>
        <span className="text-ink-500 block truncate text-[11px]">Top result: {top?.title ?? "—"}</span>
      </button>
      {isOpen && (
        <div className="bg-ink-50/60 px-3 py-3">
          <p className="text-ink-500 text-[11px] [overflow-wrap:anywhere]">
            Expected listing <span className="text-ink-700 font-mono">{expectedSourceId}</span>
          </p>
          <ol className="mt-2 space-y-1.5">
            {item.results.map((entry, index) => {
              const isExpected = entry.result.sourceId === expectedSourceId;
              return (
                <li key={entry.result.chunkId} className={`rounded-md px-2 py-1 ${isExpected ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "text-ink-700"}`}>
                  <p className="line-clamp-2">
                    <span className="text-ink-400 text-[11px] tabular-nums">#{index + 1}</span> {entry.result.title}
                    {isExpected && <span className="text-[11px] font-semibold"> · Expected</span>}
                  </p>
                  <p className="text-ink-500 mt-0.5 text-[11px] tabular-nums">
                    final {entry.finalScore.toFixed(3)} · semantic {entry.semanticScore.toFixed(3)} · lexical {entry.lexicalScore.toFixed(2)}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </li>
  );
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
      <tr className="hover:bg-ink-50/80 cursor-pointer" onClick={onToggle}>
        <td className="px-3 py-2">
          <RankBadge rank={item.matchedRank} />
        </td>
        <td className="text-ink-600 px-3 py-2 whitespace-nowrap">{CATEGORY_LABELS[item.category] ?? item.category}</td>
        <td className="text-ink-800 max-w-72 truncate px-3 py-2" title={item.query}>
          {item.query}
        </td>
        <td className="text-ink-600 max-w-64 truncate px-3 py-2" title={top?.title}>
          {top?.title ?? "—"}
        </td>
        <td className="px-3 py-2">
          <ChevronDown className={`text-ink-400 size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-ink-50/60">
          <td colSpan={5} className="px-3 py-3">
            <p className="text-ink-500 text-[11px]">
              Expected listing <span className="text-ink-700 font-mono">{expectedSourceId}</span>
            </p>
            <ol className="mt-2 space-y-1">
              {item.results.map((entry, index) => {
                const isExpected = entry.result.sourceId === expectedSourceId;
                return (
                  <li
                    key={entry.result.chunkId}
                    className={`flex items-center gap-3 rounded-md px-2 py-1 ${isExpected ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "text-ink-700"}`}
                  >
                    <span className="text-ink-400 w-6 text-right text-[11px] tabular-nums">#{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate" title={entry.result.title}>
                      {entry.result.title}
                    </span>
                    <span className="text-ink-500 text-[11px] tabular-nums">
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
