"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, RefreshCw, RotateCw } from "lucide-react";

import {
  getRagCorpusHealth,
  type RagCorpusHealthResponse,
  reingestRagDocuments,
} from "@/api/rag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/helpers/toast";

const contentTypes = ["", "listing", "policy", "image", "video", "keyword"];

// A finding's card, by how much it matters.
const SEVERITY_STYLE: Record<string, string> = {
  error: "border-rose-100 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400",
  warning: "border-amber-100 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  info: "border-blue-100 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

const RagCorpusHealthPanel = () => {
  const [contentType, setContentType] = useState("");
  const [staleDays, setStaleDays] = useState(30);
  const [health, setHealth] = useState<RagCorpusHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReingesting, setIsReingesting] = useState(false);

  const loadHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      setHealth(await getRagCorpusHealth({ contentType: contentType || undefined, staleDays }));
    } catch {
      showToast("error", "Could not load RAG corpus health.");
    } finally {
      setIsLoading(false);
    }
  }, [contentType, staleDays]);

  useEffect(() => {
    void loadHealth();
  }, [loadHealth]);

  const reingestRecommended = async () => {
    if (!window.confirm("Re-ingest failed and stale documents using the existing RAG pipeline?")) return;
    setIsReingesting(true);
    try {
      const response = await reingestRagDocuments({
        contentType: contentType || undefined,
        staleDays,
        maxDocuments: 100,
      });
      showToast(
        "success",
        response.queuedCount > 0
          ? `${response.queuedCount} document${response.queuedCount === 1 ? "" : "s"} queued for re-ingestion.`
          : "No failed, stale, or incomplete-embedding document needs re-ingestion."
      );
      await loadHealth();
    } catch {
      showToast("error", "Could not queue RAG documents for re-ingestion.");
    } finally {
      setIsReingesting(false);
    }
  };

  const currentModelCoverage = health && health.totalChunks > 0
    ? Math.round((health.currentModelEmbeddings / health.totalChunks) * 100)
    : 0;

  return (
    <Card className="border-ink-200 bg-card shadow-sm">
      <CardHeader>
        <div className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                <Database className="size-4" />
              </span>
              RAG corpus health
              {health && (
                <Badge
                  variant="outline"
                  className={
                    health.issues.length === 0
                      ? "border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300"
                      : "border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300"
                  }
                >
                  {health.issues.length === 0
                    ? "Healthy"
                    : `${health.issues.length} issue type${health.issues.length === 1 ? "" : "s"} to review`}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1 max-w-3xl text-xs leading-5">
              Inspect whether the indexed documents, chunks and active-model embeddings are still healthy.
              This is a corpus check, not a generated-answer score.
            </CardDescription>
          </div>
          {/* One row of controls; on narrow screens it wraps as a whole instead of leaving a button behind. */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:flex-nowrap">
            <select
              value={contentType}
              onChange={(event) => setContentType(event.target.value)}
              className="h-8 rounded-md border border-ink-200 bg-card px-2 text-[11px] text-ink-700 outline-none focus:border-indigo-400"
              aria-label="Corpus content type"
            >
              {contentTypes.map((value) => (
                <option key={value || "all"} value={value}>
                  {value || "All content types"}
                </option>
              ))}
            </select>
            <label className="flex h-8 items-center gap-1 rounded-md border border-ink-200 bg-card px-2 text-[11px] text-ink-600">
              Stale after
              <input
                type="number"
                min={1}
                max={3650}
                value={staleDays}
                onChange={(event) => setStaleDays(Math.max(1, Number(event.target.value) || 1))}
                className="w-12 bg-transparent text-center font-semibold outline-none"
                aria-label="Stale document days"
              />
              days
            </label>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadHealth()} disabled={isLoading}>
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button type="button" size="sm" onClick={() => void reingestRecommended()} disabled={isReingesting}>
              <RotateCw className="size-3.5" />
              {isReingesting ? "Queueing…" : "Re-ingest issues"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {health && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <HealthMetric label="Documents" value={health.totalDocuments} detail={`${health.readyDocuments} ready`} />
              <HealthMetric label="Chunks" value={health.totalChunks} detail={`${health.currentModelEmbeddings} active embeddings`} />
              <HealthMetric label="Embedding coverage" value={`${currentModelCoverage}%`} detail="active model / chunks" />
              <HealthMetric label="Missing embeddings" value={health.missingEmbeddingChunkCount} detail="not searchable by vector" tone={health.missingEmbeddingChunkCount > 0 ? "warning" : "good"} />
              <HealthMetric label="Stale ready" value={health.staleReadyDocumentCount} detail={`older than ${health.staleDays} days`} tone={health.staleReadyDocumentCount > 0 ? "warning" : "good"} />
              <HealthMetric label="Failed" value={health.failedDocuments} detail="eligible for re-ingest" tone={health.failedDocuments > 0 ? "error" : "good"} />
            </div>

            {/* What needs doing comes first, as a row of findings; the per-type table follows at full width. */}
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink-800">Actionable findings</p>
                <p className="text-[10px] text-ink-400">
                  Active embedding models: {health.embeddingModels.length > 0 ? health.embeddingModels.join(", ") : "none"}
                </p>
              </div>
              {health.issues.length === 0 ? (
                <p className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-100 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-3 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-4 shrink-0" /> No corpus health issue detected.
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
                          <span className="text-xs font-semibold text-ink-800 capitalize">
                            {issue.code.replaceAll("_", " ")}
                          </span>
                          <span className="text-sm font-bold tabular-nums">{issue.count}</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-5 text-ink-600">{issue.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-ink-200">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-ink-50 text-[10px] tracking-wide text-ink-400 uppercase">
                  <tr>
                    <th className="px-4 py-3">Content type</th>
                    <th className="px-3 py-3 text-right">Documents</th>
                    <th className="px-3 py-3 text-right">Ready</th>
                    <th className="px-3 py-3 text-right">Chunks</th>
                    <th className="px-3 py-3 text-right">Embeddings</th>
                    <th className="px-3 py-3 text-right">Missing</th>
                    <th className="px-4 py-3 text-right">Stale</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {health.byContentType.map((metric) => (
                    <tr key={metric.contentType} className="border-t border-ink-100 hover:bg-ink-50/60">
                      <td className="px-4 py-3 font-semibold text-ink-800 capitalize">{metric.contentType}</td>
                      <td className="px-3 py-3 text-right text-ink-600">{metric.documentCount}</td>
                      <td className="px-3 py-3 text-right text-ink-600">{metric.readyDocuments}</td>
                      <td className="px-3 py-3 text-right text-ink-600">{metric.chunkCount}</td>
                      <td className="px-3 py-3 text-right text-ink-600">{metric.currentModelEmbeddings}/{metric.chunkCount}</td>
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
                      <td colSpan={7} className="px-4 py-6 text-center text-xs text-ink-500">
                        No RAG documents match this filter.
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
        ? "border-rose-100 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10"
        : tone === "warning"
          ? "border-amber-100 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10"
          : "border-ink-200 bg-ink-50/60"
    }`}
  >
    <p className="text-[10px] font-bold tracking-wide text-ink-400 uppercase">{label}</p>
    <p className={`mt-1 text-xl font-bold tabular-nums ${tone === "error" ? "text-rose-600 dark:text-rose-400" : tone === "warning" ? "text-amber-600 dark:text-amber-400" : tone === "good" ? "text-emerald-600 dark:text-emerald-400" : "text-ink-900"}`}>
      {value}
    </p>
    <p className="mt-1 text-[10px] text-ink-500">{detail}</p>
  </div>
);

export { RagCorpusHealthPanel };
