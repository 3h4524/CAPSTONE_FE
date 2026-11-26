"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Database, RefreshCw, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RagCardAbout } from "@/components/admin/rag-card-about";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/helpers/toast";
import { useReingestRagDocuments } from "@/hooks/mutations/use-reingest-rag-documents";
import { useRagCorpusHealth } from "@/hooks/queries/use-rag-corpus-health";

const contentTypes = ["", "listing", "policy", "image", "video", "keyword"];
const ALL_CONTENT_TYPES = "all";
const MAX_STALE_DAYS = 3650;
const REINGEST_BATCH_LIMIT = 100;

const CONTENT_TYPE_LABEL_KEYS: Record<string, string> = {
  listing: "admin.rag.contentTypes.listing",
  policy: "admin.rag.contentTypes.policy",
  image: "admin.rag.contentTypes.image",
  video: "admin.rag.contentTypes.video",
  keyword: "admin.rag.contentTypes.keyword",
};

// A finding's card, by how much it matters.
const SEVERITY_STYLE: Record<string, string> = {
  error: "border-rose-100 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
  warning: "border-amber-100 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "border-blue-100 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

const RagCorpusHealthPanel = () => {
  const { t } = useTranslation("common");
  const [contentType, setContentType] = useState("");
  const [staleDaysInput, setStaleDaysInput] = useState("30");
  const staleDays = Number(staleDaysInput);
  const hasValidStaleDays = Number.isInteger(staleDays) && staleDays >= 1 && staleDays <= MAX_STALE_DAYS;
  const filters = { contentType: contentType || undefined, staleDays };
  const {
    data: currentHealth,
    isFetching: isFetchingHealth,
    isError: hasHealthError,
    refetch: refreshHealth,
  } = useRagCorpusHealth(filters, hasValidStaleDays);
  const { mutate: reingestDocuments, isPending: isReingesting } = useReingestRagDocuments();
  const health = hasValidStaleDays && !hasHealthError ? currentHealth : undefined;
  const canReingest = Boolean(health) && !isFetchingHealth && !isReingesting;

  const reingestRecommended = () => {
    if (!canReingest || !window.confirm(t("admin.rag.corpusHealth.reingestConfirm"))) return;

    reingestDocuments({ ...filters, maxDocuments: REINGEST_BATCH_LIMIT }, {
      onSuccess: ({ queuedCount }) => {
        showToast(
          "success",
          queuedCount > 0
            ? t("admin.rag.corpusHealth.queuedForReingest", { count: queuedCount })
            : t("admin.rag.corpusHealth.noReingestNeeded")
        );
      },
      onError: () => showToast("error", t("admin.rag.corpusHealth.reingestError")),
    });
  };

  const currentModelCoverage = health && health.totalChunks > 0
    ? Math.round((health.currentModelEmbeddings / health.totalChunks) * 100)
    : 0;

  return (
    <Card className="border-ink-200 bg-card shadow-sm">
      <CardHeader className="max-md:px-4">
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                <Database className="size-4" />
              </span>
              {t("admin.rag.corpusHealth.title")}
              {health && (
                <Badge
                  variant="outline"
                  className={
                    health.issues.length === 0
                      ? "border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-amber-200 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                  }
                >
                  {health.issues.length === 0
                    ? t("admin.rag.corpusHealth.healthy")
                    : t("admin.rag.corpusHealth.issueTypesToReview", { count: health.issues.length })}
                </Badge>
              )}
            </CardTitle>
            <RagCardAbout>{t("admin.rag.corpusHealth.about")}</RagCardAbout>
          </div>
          {/* One row of controls; on narrow screens it wraps as a whole instead of leaving a button behind. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 max-md:grid max-md:grid-cols-2 xl:flex-nowrap">
            <Select
              value={contentType || ALL_CONTENT_TYPES}
              onValueChange={(value) => setContentType(value === ALL_CONTENT_TYPES ? "" : value)}
            >
              <SelectTrigger aria-label={t("admin.rag.corpusHealth.contentTypeAria")} size="sm" className="bg-card text-[11px] max-[400px]:col-span-2 max-md:h-11 max-md:w-full max-md:text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {contentTypes.map((value) => {
                  const labelKey = CONTENT_TYPE_LABEL_KEYS[value];
                  return (
                    <SelectItem key={value || ALL_CONTENT_TYPES} value={value || ALL_CONTENT_TYPES}>
                      {labelKey ? t(labelKey) : t("admin.rag.shared.allContentTypes")}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <label className="border-ink-200 bg-card text-ink-600 flex h-8 items-center gap-1 rounded-md border px-2 text-[11px] max-[400px]:col-span-2 max-md:h-11 max-md:justify-between">
              {t("admin.rag.corpusHealth.staleAfter")}
              <Input
                type="number"
                min={1}
                max={MAX_STALE_DAYS}
                value={staleDaysInput}
                onChange={(event) => setStaleDaysInput(event.target.value)}
                className="h-6 w-14 rounded-sm border-0 bg-transparent px-1 py-0 text-center font-semibold shadow-none focus-visible:ring-1 max-md:h-9 max-md:text-base"
                aria-label={t("admin.rag.corpusHealth.staleDaysAria")}
                aria-invalid={!hasValidStaleDays}
              />
              {t("admin.rag.corpusHealth.days")}
            </label>
            <Button type="button" variant="outline" size="sm" className="max-md:min-h-10 max-md:px-2" onClick={() => void refreshHealth()} disabled={!hasValidStaleDays || isFetchingHealth}>
              <RefreshCw className={`size-3.5 ${isFetchingHealth ? "animate-spin" : ""}`} />
              {t("admin.rag.corpusHealth.refresh")}
            </Button>
            <Button type="button" size="sm" className="max-md:min-h-10 max-md:px-2" onClick={reingestRecommended} disabled={!canReingest}>
              <RotateCw className={`size-3.5 ${isReingesting ? "animate-spin" : ""}`} />
              {t("admin.rag.corpusHealth.reingestIssues")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 max-md:space-y-4 max-md:px-4">
        {(!hasValidStaleDays || (hasHealthError && !isFetchingHealth)) && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              {hasValidStaleDays
                ? t("admin.rag.corpusHealth.loadError")
                : t("admin.rag.corpusHealth.invalidStaleDays", { max: MAX_STALE_DAYS })}
            </AlertDescription>
          </Alert>
        )}
        {!health && isFetchingHealth && hasValidStaleDays && (
          <div role="status" aria-label={t("admin.rag.corpusHealth.loadingHealth")}>
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {health && (
          <>
            <div className="grid gap-3 max-md:grid-cols-2 max-md:gap-2 sm:grid-cols-2 lg:grid-cols-6">
              <HealthMetric label={t("admin.rag.corpusHealth.metricDocuments")} value={health.totalDocuments} detail={t("admin.rag.corpusHealth.readyDetail", { count: health.readyDocuments })} />
              <HealthMetric label={t("admin.rag.corpusHealth.metricChunks")} value={health.totalChunks} detail={t("admin.rag.corpusHealth.activeEmbeddingsDetail", { count: health.currentModelEmbeddings })} />
              <HealthMetric label={t("admin.rag.corpusHealth.metricEmbeddingCoverage")} value={`${currentModelCoverage}%`} detail={t("admin.rag.corpusHealth.activeModelOverChunks")} />
              <HealthMetric label={t("admin.rag.corpusHealth.metricMissingEmbeddings")} value={health.missingEmbeddingChunkCount} detail={t("admin.rag.corpusHealth.notSearchableByVector")} tone={health.missingEmbeddingChunkCount > 0 ? "warning" : "good"} />
              <HealthMetric label={t("admin.rag.corpusHealth.metricStaleReady")} value={health.staleReadyDocumentCount} detail={t("admin.rag.corpusHealth.olderThanDays", { days: health.staleDays })} tone={health.staleReadyDocumentCount > 0 ? "warning" : "good"} />
              <HealthMetric label={t("admin.rag.corpusHealth.metricFailed")} value={health.failedDocuments} detail={t("admin.rag.corpusHealth.eligibleForReingest")} tone={health.failedDocuments > 0 ? "error" : "good"} />
            </div>

            {/* What needs doing comes first, as a row of findings; the per-type table follows at full width. */}
            <div>
              <div className="flex items-center justify-between gap-2 max-md:flex-wrap">
                <p className="text-ink-800 text-xs font-bold">{t("admin.rag.corpusHealth.actionableFindings")}</p>
                <p className="text-ink-500 text-[10px]">
                  {t("admin.rag.corpusHealth.activeEmbeddingModels", { models: health.embeddingModels.length > 0 ? health.embeddingModels.join(", ") : t("admin.rag.corpusHealth.none") })}
                </p>
              </div>
              {health.issues.length === 0 ? (
                <p className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <CheckCircle2 className="size-4 shrink-0" /> {t("admin.rag.corpusHealth.noIssueDetected")}
                </p>
              ) : (
                <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {health.issues.map((issue) => (
                    <div
                      key={issue.code}
                      className={`flex gap-3 rounded-xl border p-3 ${SEVERITY_STYLE[issue.severity] ?? SEVERITY_STYLE.info}`}
                    >
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-ink-800 text-xs font-semibold capitalize">
                            {issue.code.replaceAll("_", " ")}
                          </span>
                          <span className="text-sm font-bold tabular-nums">{issue.count}</span>
                        </div>
                        <p className="text-ink-600 mt-1 text-[11px] leading-5">{issue.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="md:hidden">
              <p className="text-ink-800 text-xs font-bold">{t("admin.rag.corpusHealth.breakdownByContentType")}</p>
              {health.byContentType.length === 0 ? (
                <p className="border-ink-200 text-ink-500 mt-2 rounded-xl border px-4 py-6 text-center text-xs">{t("admin.rag.corpusHealth.noDocumentsMatchFilter")}</p>
              ) : (
                <ul className="divide-ink-100 border-ink-200 mt-2 divide-y rounded-xl border">
                  {health.byContentType.map((metric) => (
                    <li key={metric.contentType} className="space-y-2 p-3 tabular-nums">
                      <p className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-ink-800 font-semibold capitalize">{CONTENT_TYPE_LABEL_KEYS[metric.contentType] ? t(CONTENT_TYPE_LABEL_KEYS[metric.contentType]) : metric.contentType}</span>
                        <span className="text-ink-500 text-[11px]">{t("admin.rag.corpusHealth.readyOverDocs", { ready: metric.readyDocuments, total: metric.documentCount })}</span>
                      </p>
                      <dl className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-ink-500 text-[10px] tracking-wide uppercase">{t("admin.rag.corpusHealth.metricChunks")}</dt>
                          <dd className="text-ink-600 mt-0.5">{metric.chunkCount}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-500 text-[10px] tracking-wide uppercase">{t("admin.rag.corpusHealth.metricEmbeddings")}</dt>
                          <dd className="text-ink-600 mt-0.5">{metric.currentModelEmbeddings}/{metric.chunkCount}</dd>
                        </div>
                        <div>
                          <dt className="text-ink-500 text-[10px] tracking-wide uppercase">{t("admin.rag.corpusHealth.metricIssues")}</dt>
                          <dd className="mt-0.5 font-semibold">
                            <span className={metric.missingEmbeddingChunkCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>{t("admin.rag.corpusHealth.missCount", { count: metric.missingEmbeddingChunkCount })}</span>
                            <span className="text-ink-400"> / </span>
                            <span className={metric.staleReadyDocumentCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}>{t("admin.rag.corpusHealth.staleCount", { count: metric.staleReadyDocumentCount })}</span>
                          </dd>
                        </div>
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-ink-200 overflow-x-auto rounded-xl border max-md:hidden">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-ink-50 text-ink-500 text-[10px] tracking-wide uppercase">
                  <tr>
                    <th className="px-4 py-3">{t("admin.rag.shared.contentTypeHeader")}</th>
                    <th className="px-3 py-3 text-right">{t("admin.rag.corpusHealth.metricDocuments")}</th>
                    <th className="px-3 py-3 text-right">{t("admin.rag.corpusHealth.thReady")}</th>
                    <th className="px-3 py-3 text-right">{t("admin.rag.corpusHealth.metricChunks")}</th>
                    <th className="px-3 py-3 text-right">{t("admin.rag.corpusHealth.metricEmbeddings")}</th>
                    <th className="px-3 py-3 text-right">{t("admin.rag.corpusHealth.thMissing")}</th>
                    <th className="px-4 py-3 text-right">{t("admin.rag.corpusHealth.thStale")}</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {health.byContentType.map((metric) => (
                    <tr key={metric.contentType} className="border-ink-100 hover:bg-ink-50/60 border-t">
                      <td className="text-ink-800 px-4 py-3 font-semibold capitalize">{CONTENT_TYPE_LABEL_KEYS[metric.contentType] ? t(CONTENT_TYPE_LABEL_KEYS[metric.contentType]) : metric.contentType}</td>
                      <td className="text-ink-600 px-3 py-3 text-right">{metric.documentCount}</td>
                      <td className="text-ink-600 px-3 py-3 text-right">{metric.readyDocuments}</td>
                      <td className="text-ink-600 px-3 py-3 text-right">{metric.chunkCount}</td>
                      <td className="text-ink-600 px-3 py-3 text-right">{metric.currentModelEmbeddings}/{metric.chunkCount}</td>
                      <td className={`px-3 py-3 text-right font-semibold ${metric.missingEmbeddingChunkCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {metric.missingEmbeddingChunkCount}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${metric.staleReadyDocumentCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {metric.staleReadyDocumentCount}
                      </td>
                    </tr>
                  ))}
                  {health.byContentType.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-ink-500 px-4 py-6 text-center text-xs">
                        {t("admin.rag.corpusHealth.noDocumentsMatchFilter")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

const HealthMetric = ({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: number | string;
  detail: string;
  tone?: "default" | "good" | "warning" | "error";
}) => (
  <div
    className={`rounded-xl border p-3 ${
      tone === "error"
        ? "border-rose-100 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10"
        : tone === "warning"
          ? "border-amber-100 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10"
          : "border-ink-200 bg-ink-50/60"
    }`}
  >
    <p className="text-ink-500 text-[10px] font-bold tracking-wide uppercase">{label}</p>
    <p className={`mt-1 text-xl font-bold tabular-nums ${tone === "error" ? "text-rose-600 dark:text-rose-400" : tone === "warning" ? "text-amber-600 dark:text-amber-400" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : "text-ink-900"}`}>
      {value}
    </p>
    <p className="text-ink-500 mt-1 text-[10px]">{detail}</p>
  </div>
);

export { RagCorpusHealthPanel };
