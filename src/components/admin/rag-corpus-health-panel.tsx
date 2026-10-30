"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, RefreshCw, RotateCw } from "lucide-react";

import {
  getRagCorpusHealth,
  reingestRagDocuments,
  type RagCorpusHealthResponse,
} from "@/api/rag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/helpers/toast";

const contentTypes = ["", "listing", "policy", "image", "video", "keyword"];

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
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Database className="size-4 text-indigo-500" />
              RAG corpus health
            </CardTitle>
            <CardDescription className="mt-1 max-w-3xl text-xs leading-5">
              Inspect whether the indexed documents, chunks and active-model embeddings are still healthy.
              This is a corpus check, not a generated-answer score.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={contentType}
              onChange={(event) => setContentType(event.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-700 outline-none focus:border-indigo-400"
              aria-label="Corpus content type"
            >
              {contentTypes.map((value) => (
                <option key={value || "all"} value={value}>
                  {value || "All content types"}
                </option>
              ))}
            </select>
            <label className="flex h-8 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-[11px] text-slate-600">
              stale after
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
      <CardContent className="space-y-5 pt-5">
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

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] tracking-wide text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-3">Content type</th>
                      <th className="px-3 py-3">Documents</th>
                      <th className="px-3 py-3">Ready</th>
                      <th className="px-3 py-3">Chunks</th>
                      <th className="px-3 py-3">Embeddings</th>
                      <th className="px-3 py-3">Missing</th>
                      <th className="px-4 py-3">Stale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {health.byContentType.map((metric) => (
                      <tr key={metric.contentType} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold capitalize text-slate-800">{metric.contentType}</td>
                        <td className="px-3 py-3 text-slate-600">{metric.documentCount}</td>
                        <td className="px-3 py-3 text-slate-600">{metric.readyDocuments}</td>
                        <td className="px-3 py-3 text-slate-600">{metric.chunkCount}</td>
                        <td className="px-3 py-3 text-slate-600">{metric.currentModelEmbeddings}/{metric.chunkCount}</td>
                        <td className={`px-3 py-3 font-semibold ${metric.missingEmbeddingChunkCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                          {metric.missingEmbeddingChunkCount}
                        </td>
                        <td className={`px-4 py-3 font-semibold ${metric.staleReadyDocumentCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                          {metric.staleReadyDocumentCount}
                        </td>
                      </tr>
                    ))}
                    {health.byContentType.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-xs text-slate-500">
                          No RAG documents match this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-800">Actionable findings</p>
                  <Badge variant="outline" className="text-[10px]">{health.issues.length} issue types</Badge>
                </div>
                <div className="mt-3 space-y-2">
                  {health.issues.length === 0 ? (
                    <p className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs text-emerald-700">
                      <CheckCircle2 className="size-4 shrink-0" /> No corpus health issue detected.
                    </p>
                  ) : (
                    health.issues.map((issue) => (
                      <div key={issue.code} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`size-3.5 ${issue.severity === "error" ? "text-rose-500" : issue.severity === "warning" ? "text-amber-500" : "text-blue-500"}`} />
                          <span className="text-xs font-semibold capitalize text-slate-800">{issue.code.replaceAll("_", " ")}</span>
                          <Badge variant="outline" className="ml-auto text-[10px]">{issue.count}</Badge>
                        </div>
                        <p className="mt-1 text-[11px] leading-5 text-slate-500">{issue.description}</p>
                      </div>
                    ))
                  )}
                </div>
                <p className="mt-3 text-[10px] leading-4 text-slate-400">
                  Active embedding models: {health.embeddingModels.length > 0 ? health.embeddingModels.join(", ") : "none"}
                </p>
              </div>
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
  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
    <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{label}</p>
    <p className={`mt-1 text-xl font-bold ${tone === "error" ? "text-rose-600" : tone === "warning" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : "text-slate-900"}`}>
      {value}
    </p>
    <p className="mt-1 text-[10px] text-slate-500">{detail}</p>
  </div>
);

export { RagCorpusHealthPanel };
