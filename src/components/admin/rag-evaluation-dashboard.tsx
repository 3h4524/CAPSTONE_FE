"use client";

import { Fragment, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Database,
  FlaskConical,
  type LucideIcon,
  Play,
  Plus,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
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

import {
  evaluateListingRetrieval,
  type ListingRetrievalEvaluationResponse,
} from "@/api/rag";
import { RagCardAbout } from "@/components/admin/rag-card-about";
import { RagCorpusHealthPanel } from "@/components/admin/rag-corpus-health-panel";
import { RagKnownItemBenchmark } from "@/components/admin/rag-known-item-benchmark";
import { PageHeader } from "@/components/commons/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showToast } from "@/helpers/toast";
import { useEvaluateRag } from "@/hooks/mutations/use-evaluate-rag";
import { useIsPhone } from "@/hooks/use-is-phone";
import { EMPTY_EVALUATION_DRAFT, RAG_EVALUATION_HISTORY_LIMIT, useRagEvaluationWorkspace } from "@/hooks/use-rag-evaluation-workspace";
import {
  type EvaluationCase,
  type EvaluationContentType,
  type EvaluationRun,
  ragEvaluationContentTypeSchema,
  type RetrievalInsightData,
  type RetrievedChunk,
} from "@/schemas/rag-evaluation";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/utils/cn";
import { uuid } from "@/utils/uuid";

const CONTENT_TYPE_LABEL_KEYS: Record<string, string> = {
  listing: "admin.rag.contentTypes.listing",
  policy: "admin.rag.contentTypes.policy",
  image: "admin.rag.contentTypes.image",
  video: "admin.rag.contentTypes.video",
  keyword: "admin.rag.contentTypes.keyword",
};

const evaluationContentTypes = ragEvaluationContentTypeSchema.options;
const MAX_EVALUATION_CASES = 100;

const EMPTY_EVALUATION_RUN: EvaluationRun = {
  id: "",
  number: 1,
  createdAt: "",
  cases: 0,
  retrieval: 0,
  evidenceCoverage: 0,
  latency: 0,
  casesData: [],
  typeMetrics: [],
};

const RagEvaluationDashboard = () => {
  const userId = useAuthStore((state) => state.user?.id);

  return userId ? <RagEvaluationWorkspace key={userId} userId={userId} /> : null;
};

const RagEvaluationWorkspace = ({ userId }: { userId: string }) => {
  const { t } = useTranslation("common");
  const {
    workspace: { draft: draftCase, datasetCases, runs },
    updateWorkspace,
    isWorkspaceReady,
    hasStorageError,
  } = useRagEvaluationWorkspace(userId);
  const { mutate: evaluateCases, isPending: isRunning } = useEvaluateRag();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [benchmarkExpanded, setIsBenchmarkOpen] = useState<boolean | null>(null);
  const isBenchmarkOpen = benchmarkExpanded ??
    (runs.length > 0 || datasetCases.length > 0 || Boolean(draftCase.question || draftCase.expectedText));
  const isPhone = useIsPhone();
  const [filter, setFilter] = useState<"all" | EvaluationCase["verdict"]>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<"all" | EvaluationContentType>("all");
  const [listingProductId, setListingProductId] = useState("");
  const [listingTrace, setListingTrace] = useState<ListingRetrievalEvaluationResponse | null>(null);
  const [isListingTraceRunning, setIsListingTraceRunning] = useState(false);
  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? runs[0] ?? EMPTY_EVALUATION_RUN;
  const runLabel = (number: number) =>
    t("admin.rag.evaluation.evaluationRunLabel", { number: String(number).padStart(2, "0") });
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
      showToast("error", t("admin.rag.evaluation.addQuestionFirst"));
      return;
    }
    if (!draftCase.expectedText.trim()) {
      showToast("error", t("admin.rag.evaluation.addExpectedEvidence"));
      return;
    }

    const nextCase = {
      id: uuid(),
      question: draftCase.question.trim(),
      contentType: draftCase.contentType,
      expectedText: draftCase.expectedText.trim(),
    };

    updateWorkspace((current) => ({
      ...current,
      draft: EMPTY_EVALUATION_DRAFT,
      datasetCases: [...current.datasetCases, nextCase],
    }));
  };

  const removeEvaluationCase = (id: string) => {
    updateWorkspace((current) => ({
      ...current,
      datasetCases: current.datasetCases.filter((item) => item.id !== id),
    }));
  };

  const runListingRetrieval = async () => {
    if (!listingProductId.trim()) {
      showToast("error", t("admin.rag.evaluation.enterProductId"));
      return;
    }

    setIsListingTraceRunning(true);
    try {
      setListingTrace(await evaluateListingRetrieval(listingProductId.trim()));
      showToast("success", t("admin.rag.evaluation.listingRetrievalCompleted"));
    } catch {
      showToast("error", t("admin.rag.evaluation.listingRetrievalFailed"));
    } finally {
      setIsListingTraceRunning(false);
    }
  };
  const trendData = [...runs].reverse().map((run) => ({
    name: String(run.number),
    retrieval: run.retrieval,
    evidenceCoverage: run.evidenceCoverage,
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

  const runEvaluation = () => {
    evaluateCases({ cases: datasetCases, number: (runs[0]?.number ?? 0) + 1 }, {
      onSuccess: (nextRun) => {
        updateWorkspace((current) => ({
          ...current,
          runs: [nextRun, ...current.runs].slice(0, RAG_EVALUATION_HISTORY_LIMIT),
        }));
        setSelectedRunId(nextRun.id);
        setSelectedCaseId(isPhone ? null : (nextRun.casesData[0]?.id ?? null));
        setIsBenchmarkOpen(true);
        showToast("success", t("admin.rag.evaluation.evaluationRunCompleted"));
      },
      onError: () => showToast("error", t("admin.rag.evaluation.evaluationFailed")),
    });
  };

  return (
    <div className="space-y-5 max-md:space-y-3">
      <PageHeader
        eyebrow={t("admin.rag.evaluation.eyebrow")}
        title={t("admin.rag.evaluation.title")}
        description={t("admin.rag.evaluation.description")}
      />

      <Card className="bg-card border-emerald-100 shadow-sm dark:border-emerald-500/30">
        <CardHeader className="max-md:px-4">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <Search className="size-4" />
                </span>
                {t("admin.rag.evaluation.productionListingRetrieval")}
              </CardTitle>
              <RagCardAbout>{t("admin.rag.evaluation.productionListingAbout")}</RagCardAbout>
            </div>
            <Badge
              variant="outline"
              className="w-fit border-emerald-200 text-[10px] text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300"
              title={t("admin.rag.evaluation.readOnlyHint")}
            >
              {t("admin.rag.shared.readOnly")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-md:px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={listingProductId}
              onChange={(event) => setListingProductId(event.target.value)}
              placeholder={t("admin.rag.evaluation.productIdPlaceholder")}
              aria-label={t("admin.rag.evaluation.productIdAria")}
              className="sm:max-w-md"
            />
            <Button
              type="button"
              size="sm"
              onClick={runListingRetrieval}
              disabled={isListingTraceRunning}
            >
              <Search className="size-3.5" />
              {isListingTraceRunning ? t("admin.rag.shared.running") : t("admin.rag.evaluation.runProductionFlow")}
            </Button>
            <p className="text-ink-500 text-[11px]">
              {t("admin.rag.evaluation.pasteProductIdHint")}
            </p>
          </div>
          {!listingTrace && !isListingTraceRunning && (
            <ol className="border-ink-200 bg-ink-50/60 grid gap-2 rounded-xl border border-dashed p-4 sm:grid-cols-3">
              {[
                [t("admin.rag.evaluation.stepProductInput"), t("admin.rag.evaluation.stepProductInputText")],
                [t("admin.rag.evaluation.stepProductionQuery"), t("admin.rag.evaluation.stepProductionQueryText")],
                [t("admin.rag.evaluation.stepRetrievedContext"), t("admin.rag.evaluation.stepRetrievedContextText")],
              ].map(([title, text], index) => (
                <li key={title} className="flex gap-2.5">
                  <span className="bg-card flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:text-emerald-300 dark:ring-emerald-500/30">
                    {index + 1}
                  </span>
                  <span>
                    <span className="text-ink-700 block text-xs font-semibold">{title}</span>
                    <span className="text-ink-500 block text-[11px] leading-5">{text}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          {listingTrace && (
            <div className="space-y-4 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 max-md:p-2.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              {/* The coverage block already lists every input field, the product's name and type included. */}
              <ProductInputCoverage trace={listingTrace} />
              <div>
                <p className="text-ink-500 text-[10px] font-bold tracking-wide uppercase">
                  {t("admin.rag.evaluation.productionQueryLabel")}
                </p>
                <p className="bg-card text-ink-600 mt-2 rounded-lg border border-emerald-100 p-3 text-xs leading-5 whitespace-pre-wrap max-md:[overflow-wrap:anywhere] dark:border-emerald-500/30">
                  {listingTrace.productionQuery}
                </p>
              </div>
              <TraceSections
                sections={[
                  { label: t("admin.rag.evaluation.policyContextTop5"), diagnostics: listingTrace.policyContext },
                  { label: t("admin.rag.evaluation.listingReferencesTop3"), diagnostics: listingTrace.listingContext },
                ]}
              />
              <p className="text-ink-500 text-[11px]">
                {t("admin.rag.evaluation.retrievalCompletedIn", { ms: Math.round(listingTrace.durationMs) })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <RagKnownItemBenchmark />

      <RagCorpusHealthPanel />

      <Card className="bg-card border-indigo-100 shadow-sm dark:border-indigo-500/30">
        {/* Collapsed, the card is only its header: no divider or empty body below it. */}
        <CardHeader className={cn("max-md:px-4", isBenchmarkOpen && "border-b border-indigo-100 pb-4 dark:border-indigo-500/30")}>
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <FlaskConical className="size-4" />
                </span>
                {t("admin.rag.evaluation.offlineBenchmarkTitle")}
              </CardTitle>
              <RagCardAbout>{t("admin.rag.evaluation.offlineBenchmarkAbout")}</RagCardAbout>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="outline" className="w-fit text-[10px]">
                {datasetCases.length === 0
                  ? t("admin.rag.evaluation.noLabeledCasesYet")
                  : t("admin.rag.evaluation.labeledCases", { count: datasetCases.length })}
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsBenchmarkOpen(!isBenchmarkOpen)}
                aria-expanded={isBenchmarkOpen}
              >
                <ChevronDown
                  className={`size-3.5 transition-transform ${isBenchmarkOpen ? "rotate-180" : ""}`}
                />
                {isBenchmarkOpen ? t("admin.rag.evaluation.hideCard") : t("admin.rag.evaluation.openCard")}
              </Button>
            </div>
          </div>
        </CardHeader>
        {isBenchmarkOpen && (
        <CardContent className="space-y-4 pt-5 max-md:px-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_150px_minmax(0,1fr)_auto]">
            <Input
              value={draftCase.question}
              onChange={(event) => {
                const question = event.target.value;
                updateWorkspace((current) => ({ ...current, draft: { ...current.draft, question } }));
              }}
              placeholder={t("admin.rag.evaluation.goldenQuestion")}
              aria-label={t("admin.rag.evaluation.goldenQuestion")}
              disabled={!isWorkspaceReady}
            />
            <Select
              value={draftCase.contentType}
              onValueChange={(value) => {
                const parsed = ragEvaluationContentTypeSchema.safeParse(value);
                if (parsed.success) {
                  updateWorkspace((current) => ({ ...current, draft: { ...current.draft, contentType: parsed.data } }));
                }
              }}
              disabled={!isWorkspaceReady}
            >
              <SelectTrigger aria-label={t("admin.rag.evaluation.contentTypeAria")} className="bg-card w-full text-xs max-md:h-11 max-md:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {evaluationContentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(CONTENT_TYPE_LABEL_KEYS[type])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={draftCase.expectedText}
              onChange={(event) => {
                const expectedText = event.target.value;
                updateWorkspace((current) => ({ ...current, draft: { ...current.draft, expectedText } }));
              }}
              placeholder={t("admin.rag.evaluation.expectedEvidenceText")}
              aria-label={t("admin.rag.evaluation.expectedEvidenceText")}
              disabled={!isWorkspaceReady}
            />
            <Button type="button" size="sm" onClick={addEvaluationCase} disabled={!isWorkspaceReady || datasetCases.length >= MAX_EVALUATION_CASES}>
              <Plus className="size-3.5" /> {t("admin.rag.evaluation.addCase")}
            </Button>
          </div>
          <div className="text-ink-500 flex flex-wrap gap-2 text-[11px]">
            <span>{t("admin.rag.evaluation.useEvidenceTextHint")}</span>
            <span>{t("admin.rag.evaluation.indexImageVideoHint")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {datasetCases.map((item) => (
              <div
                key={item.id}
                className="border-ink-200 bg-ink-50 text-ink-600 inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-[11px]"
              >
                <Badge
                  variant="outline"
                  className="border-indigo-200 px-1.5 py-0 text-[9px] text-indigo-700 dark:border-indigo-500/30 dark:text-indigo-300"
                >
                  {t(CONTENT_TYPE_LABEL_KEYS[item.contentType])}
                </Badge>
                <span className="max-w-[220px] min-w-0 truncate">{item.question}</span>
                <button
                  type="button"
                  onClick={() => removeEvaluationCase(item.id)}
                  className="text-ink-400 rounded-full p-0.5 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
                  aria-label={t("admin.rag.evaluation.removeCaseAria", { id: item.question })}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <div className="border-ink-200 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="text-ink-500 text-xs">
              {t("admin.rag.evaluation.savedInBrowser", { count: RAG_EVALUATION_HISTORY_LIMIT })}
            </div>
            <div className="flex flex-wrap items-center gap-2 max-md:w-full">
              {runs.length > 0 && (
                <Select
                  value={selectedRun.id}
                  onValueChange={(value) => {
                    setSelectedRunId(value);
                    setSelectedCaseId(null);
                  }}
                >
                  <SelectTrigger aria-label={t("admin.rag.evaluation.evaluationRunAria")} className="bg-card h-9 text-xs font-medium max-md:w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {runs.map((run) => (
                      <SelectItem key={run.id} value={run.id}>
                        {runLabel(run.number)} · {new Date(run.createdAt).toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button type="button" className="max-md:w-full" onClick={runEvaluation} disabled={!isWorkspaceReady || isRunning || datasetCases.length === 0} size="sm">
                <Play className={cn("size-3.5", isRunning && "animate-pulse")} />
                {t("admin.rag.evaluation.runEvaluation")}
              </Button>
            </div>
          </div>
          {hasStorageError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{t("admin.rag.evaluation.storageError")}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        )}
      </Card>

      {isBenchmarkOpen && (
      <>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-[11px] text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
        <FlaskConical className="size-3.5" />{" "}
        <span className="font-semibold">{t("admin.rag.evaluation.evaluationPreview")}</span>
        <span className="text-indigo-600 dark:text-indigo-400">
          {t("admin.rag.evaluation.evaluationPreviewNote")}
        </span>
      </div>

      {runs.length > 0 ? (
        <>
      <section className="grid gap-3 max-md:grid-cols-2 max-md:gap-2 md:grid-cols-3 max-md:[&>:last-child]:col-span-2">
        <MetricCard
          icon={Search}
          label={t("admin.rag.evaluation.metricEvidenceHitRate")}
          value={`${selectedRun.retrieval}%`}
          detail={t("admin.rag.evaluation.relevantSourceFound")}
          tone="blue"
        />
        <MetricCard
          icon={ShieldCheck}
           label={t("admin.rag.evaluation.metricContextCoverage")}
          value={`${selectedRun.evidenceCoverage}%`}
           detail={t("admin.rag.evaluation.expectedEvidenceCovered")}
          tone="emerald"
        />
        <MetricCard
          icon={Clock3}
          label={t("admin.rag.evaluation.metricAvgLatency")}
          value={`${selectedRun.latency}s`}
          detail={t("admin.rag.evaluation.testCasesDetail", { count: selectedRun.cases })}
          tone="amber"
        />
      </section>

      <Card className="border-ink-200 bg-card shadow-sm">
        <CardHeader className="border-ink-100 border-b pb-4 max-md:px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="size-4 text-indigo-500" />
            {t("admin.rag.evaluation.accuracyByContentType")}
          </CardTitle>
          <CardDescription className="mt-1 text-xs">
            {t("admin.rag.evaluation.accuracyByContentTypeDesc")}
          </CardDescription>
        </CardHeader>
        <ul className="divide-ink-100 divide-y md:hidden">
          {selectedRun.typeMetrics.map((metric) => (
            <li key={metric.contentType} className="space-y-2 p-4">
              <p className="flex items-center justify-between gap-2 text-xs">
                <span className="text-ink-800 font-semibold capitalize">{CONTENT_TYPE_LABEL_KEYS[metric.contentType] ? t(CONTENT_TYPE_LABEL_KEYS[metric.contentType]) : metric.contentType}</span>
                <span className="text-ink-500 text-[11px]">{t("admin.rag.evaluation.caseCountLatency", { count: metric.caseCount, latency: Math.round(metric.averageLatencyMs) })}</span>
              </p>
              <PhoneScores
                scores={[
                  [t("admin.rag.evaluation.metricEvidenceHitRate"), metric.retrievalScore],
                  [t("admin.rag.evaluation.metricContextCoverage"), metric.contextCoverageScore],
                ]}
              />
            </li>
          ))}
        </ul>
        <div className="overflow-x-auto max-md:hidden">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="bg-ink-50 text-ink-500 text-[10px] tracking-wide uppercase">
              <tr>
                <th className="px-5 py-3">{t("admin.rag.shared.contentTypeHeader")}</th>
                <th className="px-3 py-3">{t("admin.rag.shared.thCases")}</th>
                <th className="px-3 py-3">{t("admin.rag.evaluation.metricEvidenceHitRate")}</th>
                <th className="px-3 py-3">{t("admin.rag.evaluation.metricContextCoverage")}</th>
                <th className="px-5 py-3">{t("admin.rag.evaluation.thLatency")}</th>
              </tr>
            </thead>
            <tbody>
              {selectedRun.typeMetrics.map((metric) => (
                <tr key={metric.contentType} className="border-ink-100 border-t">
                  <td className="text-ink-800 px-5 py-3 font-semibold capitalize">
                    {CONTENT_TYPE_LABEL_KEYS[metric.contentType] ? t(CONTENT_TYPE_LABEL_KEYS[metric.contentType]) : metric.contentType}
                  </td>
                  <td className="text-ink-500 px-3 py-3">{metric.caseCount}</td>
                  <td className="px-3 py-3"><ScoreBar value={metric.retrievalScore} /></td>
                  <td className="px-3 py-3"><ScoreBar value={metric.contextCoverageScore} /></td>
                  <td className="text-ink-500 px-5 py-3">{Math.round(metric.averageLatencyMs)} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Above the list the detail would open out of sight, so a phone shows it over the page. */}
      {selectedCase && isPhone && (
        <Dialog open onOpenChange={(open) => !open && setSelectedCaseId(null)}>
          <DialogContent showCloseButton={false} className="grid-cols-[minmax(0,1fr)] p-0" aria-describedby={undefined}>
            <DialogTitle className="sr-only">{t("admin.rag.evaluation.caseDetailTitle")}</DialogTitle>
            <CaseDetail item={selectedCase} onClose={() => setSelectedCaseId(null)} />
          </DialogContent>
        </Dialog>
      )}
      {selectedCase && !isPhone && (
        <Card className="bg-card border-indigo-100 shadow-sm dark:border-indigo-500/30">
          <CardHeader className="border-b border-indigo-100 pb-4 dark:border-indigo-500/30">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Search className="size-4 text-indigo-500" />
              {t("admin.rag.evaluation.retrievedChunksForCase")}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {t("admin.rag.evaluation.inspectRetrievedResults")}
            </CardDescription>
          </CardHeader>
          <CaseDetail item={selectedCase} onClose={() => setSelectedCaseId(null)} />
        </Card>
      )}

      <section className="grid gap-5 max-md:grid-cols-[minmax(0,1fr)] max-md:gap-3 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <Card className="border-ink-200 bg-card shadow-sm">
          <CardHeader className="border-ink-100 border-b pb-4 max-md:px-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <TrendingUp className="size-4 text-indigo-500" />
                  {t("admin.rag.evaluation.qualityTrend")}
                </CardTitle>
                <CardDescription className="mt-1 text-xs">
                  {t("admin.rag.evaluation.qualityTrendDesc")}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {t("admin.rag.evaluation.runsCount", { count: runs.length })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5 max-md:px-4">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 5, right: 8, left: -24, bottom: 0 }}
                >
                  <CartesianGrid stroke="var(--ink-200)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "var(--ink-500)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "var(--ink-500)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    contentStyle={{
                      borderRadius: 10,
                      borderColor: "var(--ink-200)",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="retrieval"
                    name={t("admin.rag.evaluation.metricEvidenceHitRate")}
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="evidenceCoverage"
                     name={t("admin.rag.evaluation.metricContextCoverage")}
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="text-ink-500 mt-3 flex flex-wrap gap-4 text-[11px]">
              <LegendDot color="bg-indigo-500" label={t("admin.rag.evaluation.metricEvidenceHitRate")} />
               <LegendDot color="bg-emerald-500" label={t("admin.rag.evaluation.metricContextCoverage")} />
            </div>
          </CardContent>
        </Card>
        <Card className="border-ink-200 bg-card shadow-sm">
          <CardHeader className="border-ink-100 border-b pb-4 max-md:px-4">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4 text-amber-500" />
              {t("admin.rag.evaluation.failurePatterns")}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {t("admin.rag.evaluation.failurePatternsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5 max-md:px-4">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={failureData}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 28, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--ink-200)"
                    strokeDasharray="3 3"
                    horizontal={false}
                  />
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={92}
                    tick={{ fontSize: 10, fill: "var(--ink-500)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--ink-50)" }}
                    contentStyle={{
                      borderRadius: 10,
                      borderColor: "var(--ink-200)",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" name={t("admin.rag.shared.thCases")} radius={[0, 5, 5, 0]}>
                    {failureData.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-ink-500 mt-2 text-[11px] leading-5">
              {t("admin.rag.evaluation.failurePatternsNote")}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-ink-200 bg-card overflow-hidden shadow-sm">
        <CardHeader className="border-ink-100 border-b pb-4 max-md:px-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Database className="text-ink-500 size-4" />
                {t("admin.rag.evaluation.testCases")}
              </CardTitle>
              <CardDescription className="mt-1 text-xs">
                {t("admin.rag.evaluation.testCasesDesc")}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 max-md:w-full">
              <Select
                value={contentTypeFilter}
                onValueChange={(value) => setContentTypeFilter(value as "all" | EvaluationContentType)}
              >
                <SelectTrigger aria-label={t("admin.rag.evaluation.filterByContentTypeAria")} size="sm" className="bg-card text-[11px] font-medium max-md:h-11 max-md:w-full max-md:text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="all">{t("admin.rag.shared.allContentTypes")}</SelectItem>
                  {evaluationContentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(CONTENT_TYPE_LABEL_KEYS[type])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="bg-ink-100 flex gap-1 rounded-lg p-1 max-md:grid max-md:w-full max-md:grid-cols-4">
              {(["all", "pass", "review", "fail"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold capitalize transition max-md:min-h-9 max-md:px-0.5 max-md:text-[10px] ${filter === value ? "bg-card text-ink-900 shadow-sm" : "text-ink-500 hover:text-ink-800"}`}
                >
                  {value === "all"
                    ? t("admin.rag.evaluation.filterAll", { count: visibleCases.length })
                    : t(value === "pass" ? "admin.rag.evaluation.filterPass" : value === "review" ? "admin.rag.evaluation.filterReview" : "admin.rag.evaluation.filterFail", { count: value === "pass" ? passedCases : value === "review" ? reviewCases : failedCases })}
                </button>
              ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <ul className="divide-ink-100 divide-y md:hidden">
          {visibleCases.map((item) => (
            <li key={item.id}>
              <button type="button" onClick={() => setSelectedCaseId(item.id)} className="w-full space-y-2 p-4 text-left">
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="text-ink-800 line-clamp-2 text-xs font-semibold">{item.question}</span>
                    <span className="text-ink-500 mt-0.5 block truncate text-[10px]">{item.retrievedResults[0]?.result.sourceId ?? t("admin.rag.evaluation.noSourceRetrieved")}</span>
                  </span>
                  <Verdict verdict={item.verdict} />
                </span>
                <span className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="border-indigo-200 text-[10px] text-indigo-700 dark:border-indigo-500/30 dark:text-indigo-300">{CONTENT_TYPE_LABEL_KEYS[item.contentType] ? t(CONTENT_TYPE_LABEL_KEYS[item.contentType]) : item.contentType}</Badge>
                </span>
                <PhoneScores
                  scores={[
                    [t("admin.rag.evaluation.metricEvidenceHitRate"), item.retrieval],
                    [t("admin.rag.evaluation.metricContextCoverage"), item.evidenceCoverage],
                  ]}
                />
              </button>
            </li>
          ))}
        </ul>
        <div className="overflow-x-auto max-md:hidden">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-ink-50 text-ink-500 text-[10px] tracking-wide uppercase">
              <tr>
                <th className="px-5 py-3">{t("admin.rag.evaluation.thQuestion")}</th>
                <th className="px-3 py-3">{t("admin.rag.evaluation.thType")}</th>
                <th className="px-3 py-3">{t("admin.rag.evaluation.metricEvidenceHitRate")}</th>
                <th className="px-3 py-3">{t("admin.rag.evaluation.metricContextCoverage")}</th>
                <th className="px-5 py-3 text-right">{t("admin.rag.evaluation.thVerdict")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleCases.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => setSelectedCaseId(item.id)}
                  className={`border-ink-100 hover:bg-ink-50 cursor-pointer border-t transition ${selectedCaseId === item.id ? "bg-indigo-50/50 dark:bg-indigo-500/10" : ""}`}
                >
                  <td className="max-w-[360px] px-5 py-3.5">
                    <p className="text-ink-800 truncate font-semibold">{item.question}</p>
                    <p className="text-ink-500 mt-1 truncate text-[10px]">
                      {item.retrievedResults[0]?.result.sourceId ?? t("admin.rag.evaluation.noSourceRetrieved")}
                    </p>
                  </td>
                  <td className="px-3 py-3.5">
                    <Badge variant="outline" className="border-indigo-200 text-[10px] text-indigo-700 dark:border-indigo-500/30 dark:text-indigo-300">
                      {CONTENT_TYPE_LABEL_KEYS[item.contentType] ? t(CONTENT_TYPE_LABEL_KEYS[item.contentType]) : item.contentType}
                    </Badge>
                  </td>
                  <td className="px-3 py-3.5">
                    <ScoreBar value={item.retrieval} />
                  </td>
                  <td className="px-3 py-3.5">
                    <ScoreBar value={item.evidenceCoverage} />
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
        <Card className="border-ink-200 bg-card shadow-sm">
          <CardContent className="flex items-start gap-3 py-5">
            <CircleHelp className="mt-0.5 size-4 shrink-0 text-indigo-500" />
            <div>
              <p className="text-ink-900 text-sm font-semibold">{t("admin.rag.evaluation.noBenchmarkResultYet")}</p>
              <p className="text-ink-500 mt-1 text-xs leading-5">
                {t("admin.rag.evaluation.noBenchmarkResultBody")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      </>
      )}
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
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone: "indigo" | "blue" | "emerald" | "violet" | "amber";
}) => {
  const tones = {
    indigo: "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    blue: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
    emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return (
    <Card className="border-ink-200 bg-card shadow-sm">
      <CardContent className="flex items-center gap-3 pt-5 max-md:px-3">
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl max-md:hidden ${tones[tone]}`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-ink-500 text-[10px] font-bold tracking-[0.12em] uppercase">
            {label}
          </p>
          <p className="text-ink-900 mt-1 text-xl font-bold">{value}</p>
          <p className="text-ink-500 text-[10px] leading-4 text-pretty">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
};

/** A row of scores stacked in two columns, for a phone, where the table's columns do not fit. */
const PhoneScores = ({ scores }: { scores: [label: string, value: number][] }) => (
  <span className="text-ink-500 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 text-[11px]">
    {scores.map(([label, value]) => (
      <Fragment key={label}>
        <span>{label}</span>
        <ScoreBar value={value} />
      </Fragment>
    ))}
  </span>
);

const ScoreBar = ({ value }: { value: number }) => (
  <div className="flex min-w-24 items-center gap-2">
    <Progress
      value={value}
      className="h-1.5"
      indicatorClassName={
        value >= 85 ? "bg-emerald-500" : value >= 70 ? "bg-amber-400" : "bg-rose-500"
      }
    />
    <span className="text-ink-600 w-8 text-right text-[10px] font-semibold">{value}</span>
  </div>
);

const Verdict = ({ verdict }: { verdict: EvaluationCase["verdict"] }) => {
  const { t } = useTranslation("common");
  if (verdict === "pass") {
    return (
      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
        <CheckCircle2 className="mr-1 size-3" />
        {t("admin.rag.evaluation.verdictPass")}
      </Badge>
    );
  }
  if (verdict === "review") {
    return (
      <Badge className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        <AlertTriangle className="mr-1 size-3" />
        {t("admin.rag.evaluation.verdictReview")}
      </Badge>
    );
  }
  return (
    <Badge className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      <XCircle className="mr-1 size-3" />
      {t("admin.rag.evaluation.verdictFail")}
    </Badge>
  );
};

const CaseDetail = ({ item, onClose }: { item: EvaluationCase; onClose: () => void }) => {
  const { t } = useTranslation("common");
  const contentTypeKey = CONTENT_TYPE_LABEL_KEYS[item.contentType];
  return (
  <div className="border-t border-indigo-100 bg-indigo-50/40 p-5 max-md:border-t-0 max-md:p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] font-bold tracking-[0.14em] text-indigo-500 uppercase">
          {t("admin.rag.evaluation.caseDetailTitle")}
        </p>
        <h3 className="text-ink-900 mt-1 max-w-3xl text-sm font-bold">{item.question}</h3>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onClose}>
        {t("admin.rag.evaluation.close")}
      </Button>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-4">
      <DetailBlock label={t("admin.rag.shared.contentTypeHeader")} value={contentTypeKey ? t(contentTypeKey) : item.contentType} />
      <DetailBlock label={t("admin.rag.evaluation.expectedBehavior")} value={item.expectedText || t("admin.rag.evaluation.expectedEvidenceShouldBeRetrieved")} />
      <DetailBlock label={t("admin.rag.evaluation.topRetrievedChunk")} value={item.retrievedResults[0]?.result.content ?? t("admin.rag.evaluation.noContextRetrieved")} />
      <DetailBlock label={t("admin.rag.evaluation.retrievedSource")} value={item.retrievedResults[0]?.result.sourceId ?? t("admin.rag.evaluation.noSourceRetrieved")} />
    </div>
    <div className="bg-card mt-5 rounded-xl border border-indigo-100 p-4 max-md:p-3 dark:border-indigo-500/30">
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
        <div>
          <p className="text-ink-500 text-[10px] font-bold tracking-wide uppercase">
            {t("admin.rag.evaluation.retrievedResults")}
          </p>
          <p className="text-ink-500 mt-1 text-xs">
            {t("admin.rag.evaluation.inspectChunksBeforeVerdict")}
          </p>
        </div>
        {item.retrievedResults && item.retrievedResults.length > 0 && (
          <Badge variant="outline" className="w-fit text-[10px]">
            {t("admin.rag.evaluation.resultsCount", { count: item.retrievedResults.length })}
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
        <p className="border-ink-200 bg-ink-50 text-ink-500 mt-3 rounded-lg border border-dashed px-3 py-4 text-xs">
          {t("admin.rag.evaluation.noLiveResultAttached")}
        </p>
      )}
    </div>
    {item.failure && (
      <p className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
        <AlertTriangle className="size-4 shrink-0" />
        {t("admin.rag.evaluation.failurePattern", { pattern: item.failure })}
      </p>
    )}
  </div>
  );
};

const RetrievedResultCard = ({
  diagnostic,
  rank,
}: {
  diagnostic: RetrievedChunk;
  rank: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation("common");
  const isLong = diagnostic.result.content.length > 320;
  return (
  <div className="border-ink-200 bg-ink-50/70 rounded-lg border p-3">
    {/* Rank and scores on one line, then the title and its source on their own full-width lines. */}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">#{rank}</Badge>
        <Badge variant="outline" className="text-[10px]">
          {diagnostic.result.contentType}
        </Badge>
      </div>
      <div className="text-ink-500 flex flex-wrap gap-1.5 text-[10px]">
        <ScorePill label={t("admin.rag.evaluation.scoreSemantic")} value={diagnostic.semanticScore} />
        <ScorePill label={t("admin.rag.evaluation.scoreLexical")} value={diagnostic.lexicalScore} />
        <ScorePill label={t("admin.rag.evaluation.scoreViral")} value={diagnostic.viralScore} />
        <ScorePill label={t("admin.rag.evaluation.scoreFresh")} value={diagnostic.freshnessScore} />
        <ScorePill label={t("admin.rag.evaluation.scoreFinal")} value={diagnostic.finalScore} emphasis />
      </div>
    </div>
    <p className="text-ink-800 mt-2 line-clamp-2 text-xs font-semibold" title={diagnostic.result.title}>
      {diagnostic.result.title}
    </p>
    <p className="text-ink-500 mt-0.5 truncate text-[10px]" title={`${diagnostic.result.sourceId ?? t("admin.rag.evaluation.na")} / ${diagnostic.result.chunkId}`}>
      {t("admin.rag.evaluation.sourceChunkLine", { sourceId: diagnostic.result.sourceId ?? t("admin.rag.evaluation.na"), chunkId: diagnostic.result.chunkId })}
    </p>
    <p className={`text-ink-600 mt-3 text-xs leading-5 whitespace-pre-wrap max-md:[overflow-wrap:anywhere] ${isLong && !isExpanded ? "line-clamp-4" : ""}`}>
      {diagnostic.result.content}
    </p>
    {isLong && (
      <button
        type="button"
        onClick={() => setIsExpanded((value) => !value)}
        className="mt-1 text-[11px] font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
      >
        {isExpanded ? t("admin.rag.evaluation.showLess") : t("admin.rag.evaluation.showMore")}
      </button>
    )}
  </div>
  );
};

// The final score decides the rank, so it stands out from the parts it is made of.
const ScorePill = ({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) => (
  <span
    className={`rounded-full border px-2 py-1 tabular-nums ${
      emphasis ? "border-indigo-200 bg-indigo-50 font-semibold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300" : "border-ink-200 bg-card"
    }`}
  >
    {label} {value.toFixed(3)}
  </span>
);

const ProductInputCoverage = ({
  trace,
}: {
  trace: ListingRetrievalEvaluationResponse;
}) => {
  const { t } = useTranslation("common");
  const fields = [
    { label: t("admin.rag.evaluation.fieldProductName"), value: trace.productName },
    { label: t("admin.rag.evaluation.fieldProductType"), value: trace.productType },
    { label: t("admin.rag.evaluation.fieldNiche"), value: trace.niche },
    { label: t("admin.rag.evaluation.fieldTargetAudience"), value: trace.targetAudience },
    { label: t("admin.rag.evaluation.fieldDescription"), value: trace.description },
    { label: t("admin.rag.evaluation.fieldKeywords"), value: trace.keywords.length > 0 ? trace.keywords.join(", ") : null },
    { label: t("admin.rag.evaluation.fieldNotes"), value: trace.notes },
  ];
  const populatedCount = fields.filter((field) => Boolean(field.value?.trim())).length;
  const missingFields = fields.filter((field) => !field.value?.trim()).map((field) => field.label);

  return (
    <div className="border-ink-200 bg-card rounded-xl border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-ink-800 text-xs font-bold">{t("admin.rag.evaluation.productInputCoverage")}</p>
          <p className="text-ink-500 mt-1 text-[11px]">
            {t("admin.rag.evaluation.productInputCoverageDesc")}
          </p>
        </div>
        <Badge
          variant="outline"
          className={missingFields.length === 0 ? "border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300" : "border-amber-200 text-amber-700 dark:border-amber-500/30 dark:text-amber-300"}
        >
          {t("admin.rag.evaluation.populatedCount", { populated: populatedCount, total: fields.length })}
        </Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((field) => {
          const populated = Boolean(field.value?.trim());
          return (
            <div key={field.label} className="bg-ink-50 flex min-w-0 items-start gap-2 rounded-lg px-2.5 py-2">
              {populated ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0">
                <p className="text-ink-500 text-[10px] font-semibold">{field.label}</p>
                <p className="text-ink-700 truncate text-[11px] max-md:line-clamp-2 max-md:whitespace-normal">
                  {populated ? field.value : t("admin.rag.evaluation.missing")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {missingFields.length > 0 && (
        <p className="mt-3 flex items-center gap-2 text-[11px] leading-5 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="size-3.5 shrink-0" />
          {t("admin.rag.evaluation.missingInputWarning", { fields: missingFields.join(", ") })}
        </p>
      )}
    </div>
  );
};

const RetrievalInsight = ({ diagnostics }: { diagnostics: RetrievalInsightData }) => {
  const { t } = useTranslation("common");
  const results = diagnostics.results ?? [];
  const beforeMetadata = diagnostics.candidatesBeforeMetadataFilter ?? diagnostics.metadataMatchedCandidateCount ?? 0;
  const metadataFiltered = diagnostics.metadataFilteredCandidateCount ?? 0;
  const thresholdRejected = diagnostics.thresholdRejectedCandidateCount ?? 0;
  const status = diagnostics.status ?? (results.length > 0 ? "retrieved" : "no_results");
  const confidence = diagnostics.confidence ?? (results.length > 0 ? "medium" : "none");
  const appliedFilters = diagnostics.appliedFilters ?? [];
  const warnings = diagnostics.warnings ?? [];
  const statusLabel = status === "no_results" ? t("admin.rag.evaluation.statusNoContextReturned") : status === "low_confidence" ? t("admin.rag.evaluation.statusLowConfidence") : t("admin.rag.evaluation.statusContextRetrieved");
  const statusClass = status === "retrieved"
    ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300";

  return (
    <div className="mt-3 space-y-3">
      <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 ${statusClass}`}>
        <div className="flex items-center gap-2">
          {status === "retrieved" ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
          <div>
            <p className="text-xs font-bold">{t("admin.rag.evaluation.retrievalVerdict", { verdict: statusLabel })}</p>
            <p className="mt-0.5 text-[10px] opacity-80">
              {t("admin.rag.evaluation.resultsSurvived", { count: results.length })}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="border-current text-[10px] capitalize">
          {confidence === "none" ? t("admin.rag.evaluation.noConfidence") : t("admin.rag.evaluation.confidenceLevel", { confidence })}
        </Badge>
      </div>

      <div>
        <p className="text-ink-500 text-[10px] font-bold tracking-wide uppercase">{t("admin.rag.evaluation.retrievalFunnel")}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <FunnelMetric label={t("admin.rag.evaluation.funnelBeforeMetadataFilter")} value={beforeMetadata} />
          <FunnelMetric label={t("admin.rag.evaluation.funnelMetadataRemoved")} value={metadataFiltered} tone={metadataFiltered > 0 ? "warning" : "default"} />
          <FunnelMetric label={t("admin.rag.evaluation.funnelVectorCandidates")} value={diagnostics.vectorCandidateCount} />
          <FunnelMetric label={t("admin.rag.evaluation.funnelLexicalCandidates")} value={diagnostics.lexicalCandidateCount} />
          <FunnelMetric label={t("admin.rag.evaluation.funnelThresholdRejected")} value={thresholdRejected} tone={thresholdRejected > 0 ? "warning" : "default"} />
          <FunnelMetric label={t("admin.rag.evaluation.funnelFinalResults")} value={results.length} tone={results.length > 0 ? "success" : "warning"} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <ScoreMetric label={t("admin.rag.evaluation.scoreBestSemantic")} value={diagnostics.bestSemanticScore ?? 0} />
        <ScoreMetric label={t("admin.rag.evaluation.scoreBestLexical")} value={diagnostics.bestLexicalScore ?? 0} />
        <ScoreMetric label={t("admin.rag.evaluation.scoreBestFinal")} value={diagnostics.bestFinalScore ?? 0} />
      </div>

      {appliedFilters.length > 0 && (
        <div>
          <p className="text-ink-500 text-[10px] font-bold tracking-wide uppercase">{t("admin.rag.evaluation.appliedFilters")}</p>
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
        <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="flex items-center gap-2 text-[10px] font-bold tracking-wide text-amber-800 uppercase dark:text-amber-300">
            <AlertTriangle className="size-3.5" /> {t("admin.rag.evaluation.whyAttention")}
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-5 text-amber-800 dark:text-amber-300">
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
  <div className={`rounded-lg border px-2.5 py-2 ${tone === "warning" ? "border-amber-100 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10" : tone === "success" ? "border-emerald-100 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10" : "border-ink-100 bg-ink-50"}`}>
    <p className="text-ink-500 text-[10px] leading-4">{label}</p>
    <p className="text-ink-800 mt-1 text-sm font-bold">{value}</p>
  </div>
);

const ScoreMetric = ({ label, value }: { label: string; value: number }) => (
  <div className="border-ink-100 bg-ink-50 rounded-lg border px-2.5 py-2">
    <p className="text-ink-500 text-[10px]">{label}</p>
    <p className="text-ink-800 mt-1 text-sm font-bold">{value.toFixed(3)}</p>
  </div>
);

type TraceSection = { label: string; diagnostics: ListingRetrievalEvaluationResponse["policyContext"] };

// Side by side only when both sides retrieved something. A side that came back empty folds into one
// summary line, so the other side's results get the full width instead of sitting next to a blank column.
const TraceSections = ({ sections }: { sections: TraceSection[] }) => {
  const empty = sections.filter((section) => section.diagnostics.results.length === 0);
  const filled = sections.filter((section) => section.diagnostics.results.length > 0);
  if (empty.length === 0) {
    return (
      <div className="grid items-start gap-4 xl:grid-cols-2">
        {filled.map((section) => (
          <ListingTraceResults key={section.label} label={section.label} diagnostics={section.diagnostics} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {empty.map((section) => (
        <EmptyTraceSummary key={section.label} label={section.label} diagnostics={section.diagnostics} />
      ))}
      {filled.map((section) => (
        <ListingTraceResults key={section.label} label={section.label} diagnostics={section.diagnostics} />
      ))}
    </div>
  );
};

const EmptyTraceSummary = ({ label, diagnostics }: TraceSection) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslation("common");
  const reason = diagnostics.warnings?.[0];
  return (
    <div className="bg-card rounded-xl border border-amber-100 dark:border-amber-500/30">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
        <AlertTriangle className="size-4 shrink-0 text-amber-500" />
        <p className="text-ink-800 text-xs font-bold">{label}</p>
        <span className="text-xs text-amber-700 dark:text-amber-300">{t("admin.rag.evaluation.noContextReturnedZero")}</span>
        {reason && <span className="text-ink-500 min-w-0 flex-1 truncate text-[11px] max-md:basis-full max-md:whitespace-normal" title={reason}>{reason}</span>}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto h-7 text-xs"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
        >
          <ChevronDown className={`size-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          {isOpen ? t("admin.rag.evaluation.hideDetails") : t("admin.rag.evaluation.showDetails")}
        </Button>
      </div>
      {isOpen && (
        <div className="border-t border-amber-100 px-3 pb-3 dark:border-amber-500/30">
          <RetrievalInsight diagnostics={diagnostics} />
        </div>
      )}
    </div>
  );
};

const ListingTraceResults = ({
  label,
  diagnostics,
}: {
  label: string;
  diagnostics: ListingRetrievalEvaluationResponse["policyContext"];
}) => {
  const { t } = useTranslation("common");
  return (
  <div className="border-ink-200 bg-card rounded-xl border p-3">
    <div className="flex items-center justify-between gap-2">
      <p className="text-ink-800 text-xs font-bold">{label}</p>
      <Badge variant="outline" className="text-[10px]">
        {t("admin.rag.evaluation.retrievedCount", { count: diagnostics.results.length })}
      </Badge>
    </div>
    <RetrievalInsight diagnostics={diagnostics} />
    <div className="mt-3 space-y-3">
      {diagnostics.results.length === 0 ? (
        <p className="border-ink-200 bg-ink-50 text-ink-500 rounded-lg border border-dashed px-3 py-4 text-xs">
          {t("admin.rag.evaluation.noContextRetrieved")}
        </p>
      ) : (
        diagnostics.results.map((item, index) => (
          <RetrievedResultCard key={item.result.chunkId} diagnostic={item} rank={index + 1} />
        ))
      )}
    </div>
  </div>
  );
};

const DetailBlock = ({ label, value }: { label: string; value: string }) => (
  <div className="bg-card rounded-lg border border-white/80 p-3">
    <p className="text-ink-500 text-[10px] font-bold tracking-wide uppercase">{label}</p>
    <p className="text-ink-600 mt-2 text-xs leading-5">{value}</p>
  </div>
);

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`size-2 rounded-full ${color}`} />
    {label}
  </span>
);

export { RagEvaluationDashboard };
