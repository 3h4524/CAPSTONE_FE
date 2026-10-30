"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Clock3,
  Database,
  ChevronDown,
  FlaskConical,
  Gauge,
  Plus,
  Play,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { RagCorpusHealthPanel } from "@/components/admin/rag-corpus-health-panel";
import {
  evaluateListingRetrieval,
  evaluateRag,
  type ListingRetrievalEvaluationResponse,
  type RagEvaluationTypeMetrics,
  type RagSearchDiagnostics,
  type RagSearchDiagnosticResult,
} from "@/api/rag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { showToast } from "@/helpers/toast";

type EvaluationContentType = "listing" | "image" | "video" | "policy" | "keyword";

const evaluationContentTypes: EvaluationContentType[] = [
  "listing",
  "image",
  "video",
  "policy",
  "keyword",
];

type EvaluationCase = {
  id: string;
  question: string;
  contentType: EvaluationContentType;
  category: "Retrieval" | "Groundedness" | "Citation" | "Abstention";
  retrieval: number;
  groundedness: number;
  correctness: number;
  citation: number;
  verdict: "pass" | "review" | "fail";
  failure?: string;
  source: string;
  expected: string;
  answer: string;
  expectedSourceId?: string;
  expectedText?: string;
  retrievedResults?: RagSearchDiagnosticResult[];
  diagnostics?: RagSearchDiagnostics;
};

type EvaluationRun = {
  id: string;
  label: string;
  createdAt: string;
  dataset: string;
  cases: number;
  retrieval: number;
  groundedness: number;
  citation: number;
  abstention: number;
  latency: number;
  casesData: EvaluationCase[];
  typeMetrics: RagEvaluationTypeMetrics[];
};

const RagEvaluationDashboard = ({
  fullName,
  onLogout,
}: {
  fullName: string;
  onLogout: () => void;
}) => {
  const [runs, setRuns] = useState<EvaluationRun[]>([]);
  const [datasetCases, setDatasetCases] = useState<EvaluationCase[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [filter, setFilter] = useState<"all" | EvaluationCase["verdict"]>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<"all" | EvaluationContentType>("all");
  const [listingProductId, setListingProductId] = useState("");
  const [listingTrace, setListingTrace] = useState<ListingRetrievalEvaluationResponse | null>(null);
  const [isListingTraceRunning, setIsListingTraceRunning] = useState(false);
  const [draftCase, setDraftCase] = useState({
    question: "",
    contentType: "listing" as EvaluationContentType,
    category: "Retrieval" as EvaluationCase["category"],
    expectedText: "",
  });
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? {
    id: "no-run",
    label: "No benchmark run",
    createdAt: "",
    dataset: "No labeled retrieval benchmark",
    cases: 0,
    retrieval: 0,
    groundedness: 0,
    citation: 0,
    abstention: 0,
    latency: 0,
    casesData: [],
    typeMetrics: [],
  } satisfies EvaluationRun;
  const visibleCases = useMemo(
    () =>
      selectedRun.casesData.filter(
        (item) =>
          (filter === "all" || item.verdict === filter) &&
          (contentTypeFilter === "all" || item.contentType === contentTypeFilter)
      ),
    [contentTypeFilter, filter, selectedRun]
  );
  const selectedCase = selectedRun.casesData.find((item) => item.id === selectedCaseId) ?? null;
  const passedCases = selectedRun.casesData.filter(
    (item) =>
      item.verdict === "pass" &&
      (contentTypeFilter === "all" || item.contentType === contentTypeFilter)
  ).length;
  const reviewCases = selectedRun.casesData.filter(
    (item) =>
      item.verdict === "review" &&
      (contentTypeFilter === "all" || item.contentType === contentTypeFilter)
  ).length;
  const failedCases = selectedRun.casesData.filter(
    (item) =>
      item.verdict === "fail" &&
      (contentTypeFilter === "all" || item.contentType === contentTypeFilter)
  ).length;

  const addEvaluationCase = () => {
    if (!draftCase.question.trim()) {
      showToast("error", "Add a question before saving the evaluation case.");
      return;
    }
    if (!draftCase.expectedText.trim()) {
      showToast("error", "Add expected evidence text to measure the offline case.");
      return;
    }

    const nextCase: EvaluationCase = {
      id: `case-${String(datasetCases.length + 1).padStart(3, "0")}`,
      question: draftCase.question.trim(),
      contentType: draftCase.contentType,
      category: draftCase.category,
      retrieval: 0,
      groundedness: 0,
      correctness: 0,
      citation: 0,
      verdict: "review",
      source: "Source will be shown by the live retrieval result",
      expectedText: draftCase.expectedText.trim() || undefined,
      expected:
        draftCase.expectedText.trim() ||
        "The selected content type and expected source should be retrieved.",
      answer: "Live evaluation will inspect retrieved context for this case.",
    };

    setDatasetCases((current) => [...current, nextCase]);
    setDraftCase({
      question: "",
      contentType: "listing",
      category: "Retrieval",
      expectedText: "",
    });
  };

  const removeEvaluationCase = (id: string) => {
    setDatasetCases((current) => current.filter((item) => item.id !== id));
  };

  const runListingRetrieval = async () => {
    if (!listingProductId.trim()) {
      showToast("error", "Enter a product ID to replay the production listing retrieval flow.");
      return;
    }

    setIsListingTraceRunning(true);
    try {
      setListingTrace(await evaluateListingRetrieval(listingProductId.trim()));
      showToast("success", "Production listing retrieval completed.");
    } catch {
      showToast("error", "Listing retrieval failed. Check the product ID and RAG configuration.");
    } finally {
      setIsListingTraceRunning(false);
    }
  };
  const overall = Math.round(
    (selectedRun.retrieval +
      selectedRun.groundedness +
      selectedRun.citation +
      selectedRun.abstention) /
      4
  );
  const trendData = [...runs].reverse().map((run) => ({
    name: run.label.replace("Evaluation ", "").replace(" #", " #"),
    retrieval: run.retrieval,
    groundedness: run.groundedness,
    citation: run.citation,
  }));
  const failureData = [
    ...Array.from(
      selectedRun.casesData.reduce((counts, item) => {
        if (item.failure) counts.set(item.failure, (counts.get(item.failure) ?? 0) + 1);
        return counts;
      }, new Map<string, number>())
    )
      .sort(([, left], [, right]) => right - left)
      .slice(0, 4)
      .map(([name, value], index) => ({
        name,
        value,
        color: ["#f97316", "#eab308", "#ef4444", "#8b5cf6"][index],
      })),
  ];

  const runEvaluation = async () => {
    setIsRunning(true);
    try {
      const response = await evaluateRag({
        topK: 5,
        cases: datasetCases.map((item) => ({
          id: item.id,
          category: item.category.toLowerCase(),
          contentType: item.contentType,
          search: { query: item.question, topK: 5, contentType: item.contentType },
          ...(item.expectedSourceId ? { expectedSourceId: item.expectedSourceId } : {}),
          expectedText: item.expectedText,
        })),
      });
      const nextNumber = runs.length + 1;
      const nextRun: EvaluationRun = {
        ...selectedRun,
        id: response.runId,
        label: `Evaluation Run #${String(nextNumber).padStart(2, "0")}`,
        createdAt: new Date(response.completedAt).toLocaleString(),
        cases: response.caseCount,
        retrieval: response.retrievalScore,
        groundedness: response.contextCoverageScore,
        citation: response.citationScore,
        abstention: response.abstentionScore,
        latency: response.averageLatencyMs / 1000,
        typeMetrics: response.typeMetrics ?? [],
        casesData: response.cases.map((item) => {
          const original = datasetCases.find((candidate) => candidate.id === item.id);
          const topResult = item.results[0]?.result;
          return {
            id: item.id,
            question: item.query,
            contentType: (item.contentType || original?.contentType || "listing") as EvaluationContentType,
            category: (original?.category ?? "Retrieval") as EvaluationCase["category"],
            retrieval: item.retrievalScore,
            groundedness: item.contextCoverageScore,
            correctness: item.retrievalScore,
            citation: item.citationScore,
            verdict: item.verdict,
            failure: item.failure ?? undefined,
            source: topResult?.sourceId ?? "No source retrieved",
            expected: original?.expected ?? "Expected evidence should be retrieved.",
            answer: topResult?.content ?? "No answer was generated; this run evaluates retrieval only.",
            diagnostics: item.diagnostics,
            expectedSourceId: original?.expectedSourceId,
            expectedText: original?.expectedText,
            retrievedResults: item.results,
          };
        }),
      };
      setRuns((current) => [nextRun, ...current]);
      setSelectedRunId(nextRun.id);
      setSelectedCaseId(nextRun.casesData[0]?.id ?? null);
      setIsBenchmarkOpen(true);
      showToast("success", "Evaluation run completed.");
    } catch {
      showToast("error", "Evaluation failed. Check the API and embedding configuration.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-dvh min-h-0 overflow-hidden bg-[#f8fafc] text-slate-900">
      <div className="flex h-full min-h-0">
        <AdminSidebar
          fullName={fullName}
          onLogout={onLogout}
          activeItem="RAG Evaluation"
          isMobileOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
        />
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="h-full min-h-0 overflow-y-auto">
            <AdminTopbar
              fullName={fullName}
              pageTitle="RAG Evaluation"
              onMenuClick={() => setIsMobileSidebarOpen(true)}
            />
            <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-4 sm:px-[calc(1.5rem+1cm)] sm:py-5 2xl:max-w-[1720px]">
              <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.16em] text-indigo-500 uppercase">
                    RAG quality lab
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
                    Evaluation dashboard
                  </h1>
                  <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                    Inspect retrieval traces and corpus health before RAG reaches seller-facing workflows.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {runs.length > 0 && (
                    <select
                    value={selectedRunId ?? ""}
                    onChange={(event) => {
                      setSelectedRunId(event.target.value);
                      setSelectedCaseId(null);
                    }}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm outline-none focus:border-indigo-400"
                  >
                    {runs.map((run) => (
                      <option key={run.id} value={run.id}>
                        {run.label} / {run.createdAt}
                      </option>
                    ))}
                    </select>
                  )}
                  {datasetCases.length > 0 && (
                    <Button type="button" onClick={runEvaluation} disabled={isRunning} size="sm">
                    <Play className="size-3.5" /> {isRunning ? "Running..." : "Run evaluation"}
                    </Button>
                  )}
                </div>
              </header>

              <Card className="border-emerald-100 bg-white shadow-sm">
                <CardHeader className="border-b border-emerald-100 pb-4">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Search className="size-4 text-emerald-600" />
                        Production listing retrieval
                      </CardTitle>
                      <CardDescription className="mt-1 max-w-3xl text-xs leading-5">
                        Replay the end-user listing flow from a product input. The backend builds the
                        same production query, then retrieves policy Top 5 and listing references Top 3.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="w-fit border-emerald-200 text-[10px] text-emerald-700">
                      No source ID required
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Input
                      value={listingProductId}
                      onChange={(event) => setListingProductId(event.target.value)}
                      placeholder="Product ID"
                      aria-label="Product ID"
                      className="sm:max-w-md"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={runListingRetrieval}
                      disabled={isListingTraceRunning}
                    >
                      <Search className="size-3.5" />
                      {isListingTraceRunning ? "Running..." : "Run production flow"}
                    </Button>
                  </div>
                  {listingTrace && (
                    <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <DetailBlock label="Product" value={listingTrace.productName} />
                        <DetailBlock label="Product type" value={listingTrace.productType} />
                        <DetailBlock label="Niche" value={listingTrace.niche ?? "Not specified"} />
                        <DetailBlock label="Target audience" value={listingTrace.targetAudience ?? "Not specified"} />
                      </div>
                      <ProductInputCoverage trace={listingTrace} />
                      <div>
                        <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                          Production query
                        </p>
                        <p className="mt-2 whitespace-pre-wrap rounded-lg border border-emerald-100 bg-white p-3 text-xs leading-5 text-slate-600">
                          {listingTrace.productionQuery}
                        </p>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <ListingTraceResults
                          label="Policy context - Top 5"
                          diagnostics={listingTrace.policyContext}
                        />
                        <ListingTraceResults
                          label="Listing references · Top 3"
                          diagnostics={listingTrace.listingContext}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Retrieval completed in {Math.round(listingTrace.durationMs)} ms. This trace
                        mirrors the retrieval stage used before listing generation; it does not write a new listing.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <RagCorpusHealthPanel />

              <Card className="border-indigo-100 bg-white shadow-sm">
                <CardHeader className="border-b border-indigo-100 pb-4">
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Database className="size-4 text-indigo-500" />
                        Advanced offline benchmark
                      </CardTitle>
                      <CardDescription className="mt-1 max-w-3xl text-xs leading-5">
                        Use labeled evidence cases when you need a measurable Recall @K regression check.
                        Production listing retrieval above remains the primary RAG inspection flow.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-fit text-[10px]">
                        {datasetCases.length} cases ready
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsBenchmarkOpen((value) => !value)}
                        aria-expanded={isBenchmarkOpen}
                      >
                        <ChevronDown
                          className={`size-3.5 transition-transform ${isBenchmarkOpen ? "rotate-180" : ""}`}
                        />
                        {isBenchmarkOpen ? "Hide" : "Open"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isBenchmarkOpen && (
                <CardContent className="space-y-4 pt-5">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_150px_150px_minmax(0,1fr)_auto]">
                    <Input
                      value={draftCase.question}
                      onChange={(event) =>
                        setDraftCase((current) => ({ ...current, question: event.target.value }))
                      }
                      placeholder="Golden question"
                      aria-label="Golden question"
                    />
                    <select
                      value={draftCase.contentType}
                      onChange={(event) =>
                        setDraftCase((current) => ({
                          ...current,
                          contentType: event.target.value as EvaluationContentType,
                        }))
                      }
                      className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-indigo-400"
                      aria-label="Content type"
                    >
                      {evaluationContentTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <select
                      value={draftCase.category}
                      onChange={(event) =>
                        setDraftCase((current) => ({
                          ...current,
                          category: event.target.value as EvaluationCase["category"],
                        }))
                      }
                      className="h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-indigo-400"
                      aria-label="Evaluation category"
                    >
                      {(["Retrieval"] as const).map(
                        (category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        )
                      )}
                    </select>
                    <Input
                      value={draftCase.expectedText}
                      onChange={(event) =>
                        setDraftCase((current) => ({ ...current, expectedText: event.target.value }))
                      }
                      placeholder="Expected evidence text"
                      aria-label="Expected evidence text"
                    />
                    <Button type="button" size="sm" onClick={addEvaluationCase}>
                      <Plus className="size-3.5" /> Add case
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span>Use evidence text copied from the expected chunk.</span>
                    <span>For image/video, index caption, OCR, transcript or metadata first.</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {datasetCases.map((item) => (
                      <div
                        key={item.id}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
                      >
                        <span className="font-semibold text-slate-800">{item.id}</span>
                        <Badge
                          variant="outline"
                          className="border-indigo-200 px-1.5 py-0 text-[9px] text-indigo-700"
                        >
                          {item.contentType}
                        </Badge>
                        <span className="max-w-[220px] truncate">{item.question}</span>
                        <button
                          type="button"
                          onClick={() => removeEvaluationCase(item.id)}
                          className="rounded-full p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Remove ${item.id}`}
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
                )}
              </Card>

              {isBenchmarkOpen && (
              <>
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[11px] text-indigo-800">
                <FlaskConical className="size-3.5" />{" "}
                <span className="font-semibold">Evaluation preview</span>
                <span className="text-indigo-600">
                   Run evaluation now sends the golden cases to the live RAG retrieval API. Groundedness
                   here means retrieved-context coverage; answer generation is not executed by this run.
                </span>
              </div>

              {runs.length > 0 ? (
                <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <MetricCard
                  icon={Gauge}
                  label="Overall quality"
                  value={`${overall}%`}
                  detail="average across dimensions"
                  tone="indigo"
                />
                <MetricCard
                  icon={Search}
                  label="Recall @5"
                  value={`${selectedRun.retrieval}%`}
                  detail="relevant source found"
                  tone="blue"
                />
                <MetricCard
                  icon={ShieldCheck}
                   label="Context coverage"
                  value={`${selectedRun.groundedness}%`}
                   detail="expected evidence covered"
                  tone="emerald"
                />
                <MetricCard
                  icon={Target}
                  label="Citation accuracy"
                  value={`${selectedRun.citation}%`}
                  detail="source points to evidence"
                  tone="violet"
                />
                <MetricCard
                  icon={Clock3}
                  label="Avg latency"
                  value={`${selectedRun.latency}s`}
                  detail={`${selectedRun.cases} test cases`}
                  tone="amber"
                />
              </section>

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Target className="size-4 text-indigo-500" />
                    Accuracy by content type
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    Compare retrieval accuracy and evidence coverage for each indexed content type.
                  </CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[820px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] tracking-wide text-slate-400 uppercase">
                      <tr>
                        <th className="px-5 py-3">Content type</th>
                        <th className="px-3 py-3">Cases</th>
                        <th className="px-3 py-3">Recall @5</th>
                        <th className="px-3 py-3">Context coverage</th>
                        <th className="px-3 py-3">Citation</th>
                        <th className="px-3 py-3">Abstention</th>
                        <th className="px-5 py-3">Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRun.typeMetrics.map((metric) => (
                        <tr key={metric.contentType} className="border-t border-slate-100">
                          <td className="px-5 py-3 font-semibold capitalize text-slate-800">
                            {metric.contentType}
                          </td>
                          <td className="px-3 py-3 text-slate-500">{metric.caseCount}</td>
                          <td className="px-3 py-3"><ScoreBar value={metric.retrievalScore} /></td>
                          <td className="px-3 py-3"><ScoreBar value={metric.contextCoverageScore} /></td>
                          <td className="px-3 py-3"><ScoreBar value={metric.citationScore} /></td>
                          <td className="px-3 py-3"><ScoreBar value={metric.abstentionScore} /></td>
                          <td className="px-5 py-3 text-slate-500">{Math.round(metric.averageLatencyMs)} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {selectedCase && (
                <Card className="border-indigo-100 bg-white shadow-sm">
                  <CardHeader className="border-b border-indigo-100 pb-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Search className="size-4 text-indigo-500" />
                      Retrieved chunks for this case
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      Inspect the actual RAG results returned for the question. No generated answer is involved.
                    </CardDescription>
                  </CardHeader>
                  <CaseDetail item={selectedCase} onClose={() => setSelectedCaseId(null)} />
                </Card>
              )}

              <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <TrendingUp className="size-4 text-indigo-500" />
                          Quality trend
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          Compare the evaluation dimensions across saved runs.
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {runs.length} runs
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={trendData}
                          margin={{ top: 5, right: 8, left: -24, bottom: 0 }}
                        >
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            domain={[50, 100]}
                            tick={{ fontSize: 11, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <ChartTooltip
                            contentStyle={{
                              borderRadius: 10,
                              borderColor: "#e2e8f0",
                              fontSize: 12,
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="retrieval"
                            name="Recall @5"
                            stroke="#6366f1"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="groundedness"
                             name="Context coverage"
                            stroke="#10b981"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="citation"
                            name="Citation"
                            stroke="#8b5cf6"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-slate-500">
                      <LegendDot color="bg-indigo-500" label="Recall @5" />
                       <LegendDot color="bg-emerald-500" label="Context coverage" />
                      <LegendDot color="bg-violet-500" label="Citation accuracy" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="size-4 text-amber-500" />
                      Failure patterns
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs">
                      Where the current run needs attention.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={failureData}
                          layout="vertical"
                          margin={{ top: 0, right: 8, left: 28, bottom: 0 }}
                        >
                          <CartesianGrid
                            stroke="#e2e8f0"
                            strokeDasharray="3 3"
                            horizontal={false}
                          />
                          <XAxis type="number" allowDecimals={false} hide />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={92}
                            tick={{ fontSize: 10, fill: "#64748b" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <ChartTooltip
                            cursor={{ fill: "#f8fafc" }}
                            contentStyle={{
                              borderRadius: 10,
                              borderColor: "#e2e8f0",
                              fontSize: 12,
                            }}
                          />
                          <Bar dataKey="value" name="Cases" radius={[0, 5, 5, 0]}>
                            {failureData.map((item) => (
                              <Cell key={item.name} fill={item.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-slate-500">
                      Most actionable issue: prevent unsupported product claims when the retrieved
                      source does not contain the attribute.
                    </p>
                  </CardContent>
                </Card>
              </section>

              <section className="grid gap-5 lg:grid-cols-3">
                <InsightCard
                  icon={Search}
                  tone="indigo"
                  title="Retrieval is improving"
                  text={`Recall @5 increased ${Math.round(selectedRun.retrieval - runs[runs.length - 1].retrieval)} points since the first run.`}
                />
                <InsightCard
                  icon={ShieldCheck}
                  tone="emerald"
                  title="Groundedness is the next lever"
                  text={`${100 - selectedRun.groundedness}% of the current quality gap comes from unsupported or incomplete claims.`}
                />
                <InsightCard
                  icon={CircleHelp}
                  tone="amber"
                  title="Add more no-answer cases"
                  text="Abstention accuracy is lower than retrieval. Expand the dataset with questions outside the knowledge base."
                />
              </section>

              <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Database className="size-4 text-slate-500" />
                        Test cases
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        Inspect each question, retrieved source and evaluation verdict.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <select
                        value={contentTypeFilter}
                        onChange={(event) =>
                          setContentTypeFilter(event.target.value as "all" | EvaluationContentType)
                        }
                        className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] font-medium text-slate-600 outline-none focus:border-indigo-400"
                        aria-label="Filter by content type"
                      >
                        <option value="all">All content types</option>
                        {evaluationContentTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                      {(["all", "pass", "review", "fail"] as const).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setFilter(value)}
                          className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold capitalize transition ${filter === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                        >
                          {value === "all"
                            ? `All (${visibleCases.length})`
                            : `${value} (${value === "pass" ? passedCases : value === "review" ? reviewCases : failedCases})`}
                        </button>
                      ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] tracking-wide text-slate-400 uppercase">
                      <tr>
                        <th className="px-5 py-3">Question</th>
                        <th className="px-3 py-3">Type</th>
                        <th className="px-3 py-3">Category</th>
                        <th className="px-3 py-3">Retrieval</th>
                        <th className="px-3 py-3">Context coverage</th>
                        <th className="px-3 py-3">Citation</th>
                        <th className="px-5 py-3 text-right">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleCases.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedCaseId(item.id)}
                          className={`cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 ${selectedCaseId === item.id ? "bg-indigo-50/50" : ""}`}
                        >
                          <td className="max-w-[360px] px-5 py-3.5">
                            <p className="truncate font-semibold text-slate-800">{item.question}</p>
                            <p className="mt-1 truncate text-[10px] text-slate-400">
                              {item.source}
                            </p>
                          </td>
                          <td className="px-3 py-3.5">
                            <Badge variant="outline" className="border-indigo-200 text-[10px] text-indigo-700">
                              {item.contentType}
                            </Badge>
                          </td>
                          <td className="px-3 py-3.5">
                            <Badge variant="outline" className="text-[10px]">
                              {item.category}
                            </Badge>
                          </td>
                          <td className="px-3 py-3.5">
                            <ScoreBar value={item.retrieval} />
                          </td>
                          <td className="px-3 py-3.5">
                            <ScoreBar value={item.groundedness} />
                          </td>
                          <td className="px-3 py-3.5">
                            <ScoreBar value={item.citation} />
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Verdict verdict={item.verdict} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
                </>
              ) : (
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardContent className="flex items-start gap-3 py-5">
                    <CircleHelp className="mt-0.5 size-4 shrink-0 text-indigo-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">No benchmark result yet</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        The live listing trace and corpus health above are the RAG inspection tools. Add a
                        labeled evidence case only when you want a measurable Recall @K result; no sample score is shown here.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
              </>
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  detail: string;
  tone: "indigo" | "blue" | "emerald" | "violet" | "amber";
}) => {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="flex items-center gap-3 pt-5">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-bold tracking-[0.12em] text-slate-400 uppercase">
            {label}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
          <p className="truncate text-[10px] text-slate-500">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const ScoreBar = ({ value }: { value: number }) => (
  <div className="flex min-w-24 items-center gap-2">
    <Progress
      value={value}
      className="h-1.5"
      indicatorClassName={
        value >= 85 ? "bg-emerald-500" : value >= 70 ? "bg-amber-400" : "bg-rose-500"
      }
    />
    <span className="w-8 text-right text-[10px] font-semibold text-slate-600">{value}</span>
  </div>
);

const Verdict = ({ verdict }: { verdict: EvaluationCase["verdict"] }) =>
  verdict === "pass" ? (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
      <CheckCircle2 className="mr-1 size-3" />
      Pass
    </Badge>
  ) : verdict === "review" ? (
    <Badge className="border-amber-200 bg-amber-50 text-amber-700">
      <AlertTriangle className="mr-1 size-3" />
      Review
    </Badge>
  ) : (
    <Badge className="border-rose-200 bg-rose-50 text-rose-700">
      <XCircle className="mr-1 size-3" />
      Fail
    </Badge>
  );

const CaseDetail = ({ item, onClose }: { item: EvaluationCase; onClose: () => void }) => (
  <div className="border-t border-indigo-100 bg-indigo-50/40 p-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold tracking-[0.14em] text-indigo-500 uppercase">
          Case detail - {item.id}
        </p>
        <h3 className="mt-1 max-w-3xl text-sm font-bold text-slate-900">{item.question}</h3>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>
        Close
      </Button>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-4">
      <DetailBlock label="Content type" value={item.contentType} />
      <DetailBlock label="Expected behavior" value={item.expected} />
      <DetailBlock label="Model answer" value={item.answer} />
      <DetailBlock label="Retrieved source" value={item.source} />
    </div>
    <div className="mt-5 rounded-xl border border-indigo-100 bg-white p-4">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">
            Retrieved results
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Inspect the actual chunks returned for this question before trusting the verdict.
          </p>
        </div>
        {item.retrievedResults && item.retrievedResults.length > 0 && (
          <Badge variant="outline" className="w-fit text-[10px]">
            {item.retrievedResults.length} result{item.retrievedResults.length === 1 ? "" : "s"}
          </Badge>
        )}
      </div>
      {item.diagnostics && <RetrievalInsight diagnostics={item.diagnostics} />}
      {item.retrievedResults && item.retrievedResults.length > 0 ? (
        <div className="mt-3 space-y-3">
          {item.retrievedResults.map((diagnostic, index) => (
            <RetrievedResultCard key={diagnostic.result.chunkId} diagnostic={diagnostic} rank={index + 1} />
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
          No live retrieved result is attached to this case yet. Run the evaluation to fetch results
          from the RAG API.
        </p>
      )}
    </div>
    {item.failure && (
      <p className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <AlertTriangle className="size-4 shrink-0" />
        Failure pattern: {item.failure}
      </p>
    )}
  </div>
);

const RetrievedResultCard = ({
  diagnostic,
  rank,
}: {
  diagnostic: RagSearchDiagnosticResult;
  rank: number;
}) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
    <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">#{rank}</Badge>
          <Badge variant="outline" className="text-[10px]">
            {diagnostic.result.contentType}
          </Badge>
          <p className="truncate text-xs font-semibold text-slate-800">{diagnostic.result.title}</p>
        </div>
        <p className="mt-1 break-all text-[10px] text-slate-400">
          source: {diagnostic.result.sourceId ?? "n/a"} / chunk: {diagnostic.result.chunkId}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1.5 text-[10px] text-slate-500">
        <ScorePill label="semantic" value={diagnostic.semanticScore} />
        <ScorePill label="lexical" value={diagnostic.lexicalScore} />
        <ScorePill label="viral" value={diagnostic.viralScore} />
        <ScorePill label="fresh" value={diagnostic.freshnessScore} />
        <ScorePill label="final" value={diagnostic.finalScore} />
      </div>
    </div>
    <p className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">
      {diagnostic.result.content}
    </p>
  </div>
);

const ScorePill = ({ label, value }: { label: string; value: number }) => (
  <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
    {label} {value.toFixed(3)}
  </span>
);

const ProductInputCoverage = ({
  trace,
}: {
  trace: ListingRetrievalEvaluationResponse;
}) => {
  const fields = [
    { label: "Product name", value: trace.productName },
    { label: "Product type", value: trace.productType },
    { label: "Niche", value: trace.niche },
    { label: "Target audience", value: trace.targetAudience },
    { label: "Description", value: trace.description },
    { label: "Keywords", value: trace.keywords.length > 0 ? trace.keywords.join(", ") : null },
    { label: "Notes", value: trace.notes },
  ];
  const populatedCount = fields.filter((field) => Boolean(field.value?.trim())).length;
  const missingFields = fields.filter((field) => !field.value?.trim()).map((field) => field.label);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-slate-800">Product input coverage</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Fields used to build the production query and metadata filters.
          </p>
        </div>
        <Badge
          variant="outline"
          className={missingFields.length === 0 ? "border-emerald-200 text-emerald-700" : "border-amber-200 text-amber-700"}
        >
          {populatedCount}/{fields.length} populated
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => {
          const populated = Boolean(field.value?.trim());
          return (
            <div key={field.label} className="flex min-w-0 items-start gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
              {populated ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-500">{field.label}</p>
                <p className="truncate text-[11px] text-slate-700">
                  {populated ? field.value : "Missing"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {missingFields.length > 0 && (
        <p className="mt-3 flex items-center gap-2 text-[11px] leading-5 text-amber-700">
          <AlertTriangle className="size-3.5 shrink-0" />
          Missing input can make the production query and metadata filtering less specific: {missingFields.join(", ")}.
        </p>
      )}
    </div>
  );
};

const RetrievalInsight = ({ diagnostics }: { diagnostics: RagSearchDiagnostics }) => {
  const results = diagnostics.results ?? [];
  const beforeMetadata = diagnostics.candidatesBeforeMetadataFilter ?? diagnostics.metadataMatchedCandidateCount ?? 0;
  const metadataFiltered = diagnostics.metadataFilteredCandidateCount ?? 0;
  const thresholdRejected = diagnostics.thresholdRejectedCandidateCount ?? 0;
  const status = diagnostics.status ?? (results.length > 0 ? "retrieved" : "no_results");
  const confidence = diagnostics.confidence ?? (results.length > 0 ? "medium" : "none");
  const appliedFilters = diagnostics.appliedFilters ?? [];
  const warnings = diagnostics.warnings ?? [];
  const statusLabel = status === "no_results" ? "No context returned" : status === "low_confidence" ? "Low confidence" : "Context retrieved";
  const statusClass = status === "retrieved"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className="mt-3 space-y-3">
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${statusClass}`}>
        <div className="flex items-center gap-2">
          {status === "retrieved" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
          <div>
            <p className="text-xs font-bold">Retrieval verdict: {statusLabel}</p>
            <p className="mt-0.5 text-[10px] opacity-80">
              {results.length} result(s) survived the retrieval pipeline.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-current text-[10px] capitalize">
          {confidence} confidence
        </Badge>
      </div>

      <div>
        <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Retrieval funnel</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FunnelMetric label="Before metadata filter" value={beforeMetadata} />
          <FunnelMetric label="Metadata removed" value={metadataFiltered} tone={metadataFiltered > 0 ? "warning" : "default"} />
          <FunnelMetric label="Vector candidates" value={diagnostics.vectorCandidateCount} />
          <FunnelMetric label="Lexical candidates" value={diagnostics.lexicalCandidateCount} />
          <FunnelMetric label="Threshold rejected" value={thresholdRejected} tone={thresholdRejected > 0 ? "warning" : "default"} />
          <FunnelMetric label="Final results" value={results.length} tone={results.length > 0 ? "success" : "warning"} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ScoreMetric label="Best semantic" value={diagnostics.bestSemanticScore ?? 0} />
        <ScoreMetric label="Best lexical" value={diagnostics.bestLexicalScore ?? 0} />
        <ScoreMetric label="Best final" value={diagnostics.bestFinalScore ?? 0} />
      </div>

      {appliedFilters.length > 0 && (
        <div>
          <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">Applied filters</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {appliedFilters.map((filter) => (
              <Badge key={filter} variant="outline" className="max-w-full truncate text-[10px] font-normal">
                {filter}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-wide text-amber-800 uppercase">
            <AlertTriangle className="size-3.5" /> Why this result needs attention
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-5 text-amber-800">
            {warnings.map((warning) => <li key={warning}>- {warning}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
};

const FunnelMetric = ({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warning" | "success";
}) => (
  <div className={`rounded-lg border px-2.5 py-2 ${tone === "warning" ? "border-amber-100 bg-amber-50/60" : tone === "success" ? "border-emerald-100 bg-emerald-50/60" : "border-slate-100 bg-slate-50"}`}>
    <p className="text-[10px] leading-4 text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
  </div>
);

const ScoreMetric = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
    <p className="text-[10px] text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-bold text-slate-800">{value.toFixed(3)}</p>
  </div>
);

const ListingTraceResults = ({
  label,
  diagnostics,
}: {
  label: string;
  diagnostics: ListingRetrievalEvaluationResponse["policyContext"];
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <div className="flex items-center justify-between gap-2">
      <p className="text-xs font-bold text-slate-800">{label}</p>
      <Badge variant="outline" className="text-[10px]">
        {diagnostics.results.length} retrieved
      </Badge>
    </div>
    <RetrievalInsight diagnostics={diagnostics} />
    <div className="mt-3 space-y-3">
      {diagnostics.results.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-xs text-slate-500">
          No context was retrieved.
        </p>
      ) : (
        diagnostics.results.map((item, index) => (
          <RetrievedResultCard key={item.result.chunkId} diagnostic={item} rank={index + 1} />
        ))
      )}
    </div>
  </div>
);

const DetailBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-white/80 bg-white p-3">
    <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{label}</p>
    <p className="mt-2 text-xs leading-5 text-slate-600">{value}</p>
  </div>
);

const InsightCard = ({
  icon: Icon,
  tone,
  title,
  text,
}: {
  icon: typeof Search;
  tone: "indigo" | "emerald" | "amber";
  title: string;
  text: string;
}) => {
  const styles = {
    indigo: "border-indigo-100 bg-indigo-50/50 text-indigo-600",
    emerald: "border-emerald-100 bg-emerald-50/50 text-emerald-600",
    amber: "border-amber-100 bg-amber-50/50 text-amber-600",
  };
  return (
    <div className={`rounded-xl border p-4 ${styles[tone]}`}>
      <Icon className="size-4" />
      <p className="mt-3 text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-600">{text}</p>
    </div>
  );
};

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`size-2 rounded-full ${color}`} />
    {label}
  </span>
);

export { RagEvaluationDashboard };
