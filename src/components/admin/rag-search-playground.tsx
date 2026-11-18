"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { type RagSearchDiagnostics, type RagSearchRequest, searchRagWithDiagnostics } from "@/api/rag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/helpers/toast";

const RagSearchPlayground = () => {
  const { t } = useTranslation("common");
  const [query, setQuery] = useState("");
  const [contentType, setContentType] = useState("");
  const [platform, setPlatform] = useState("");
  const [niche, setNiche] = useState("");
  const [minimumViralScore, setMinimumViralScore] = useState("");
  const [topK, setTopK] = useState("5");
  const [isSearching, setIsSearching] = useState(false);
  const [diagnostics, setDiagnostics] = useState<RagSearchDiagnostics | null>(null);

  const runSearch = async () => {
    if (!query.trim()) {
      showToast("error", t("admin.rag.searchPlayground.enterQuery"));
      return;
    }
    setIsSearching(true);
    try {
      const request: RagSearchRequest = {
        query: query.trim(),
        topK: Number(topK) || 5,
        contentType: contentType || undefined,
        platform: platform || undefined,
        niche: niche || undefined,
        minimumViralScore: minimumViralScore ? Number(minimumViralScore) : undefined,
      };
      setDiagnostics(await searchRagWithDiagnostics(request));
    } catch {
      showToast("error", t("admin.rag.searchPlayground.searchFailed"));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-5 max-md:space-y-3">
      <div>
        <p className="text-ink-400 text-[10px] font-bold tracking-[0.16em] uppercase">{t("admin.rag.searchPlayground.eyebrow")}</p>
        <h2 className="text-ink-900 mt-1 text-2xl font-bold tracking-tight max-md:text-xl">{t("admin.rag.searchPlayground.title")}</h2>
        <p className="text-ink-500 mt-1 max-w-2xl text-xs leading-5">
          {t("admin.rag.searchPlayground.description")}
        </p>
      </div>

      <Card className="border-ink-200 bg-card shadow-sm">
        <CardHeader className="border-ink-100 border-b pb-4 max-md:px-4">
          <CardTitle className="flex items-center gap-2 text-sm"><SlidersHorizontal className="text-ink-500 size-4" /> {t("admin.rag.searchPlayground.queryAndFilters")}</CardTitle>
          <CardDescription className="mt-1 text-xs">{t("admin.rag.searchPlayground.queryAndFiltersDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5 max-md:px-4">
          <Textarea value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("admin.rag.searchPlayground.queryPlaceholder")} className="min-h-24 text-sm max-md:text-base" />
          <div className="grid gap-3 max-md:grid-cols-2 max-md:gap-2 md:grid-cols-2 lg:grid-cols-5 max-md:[&>:last-child]:col-span-2">
            <Input value={contentType} onChange={(event) => setContentType(event.target.value)} placeholder={t("admin.rag.searchPlayground.contentTypePlaceholder")} />
            <Input value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder={t("admin.rag.searchPlayground.platformPlaceholder")} />
            <Input value={niche} onChange={(event) => setNiche(event.target.value)} placeholder={t("admin.rag.searchPlayground.nichePlaceholder")} />
            <Input value={minimumViralScore} onChange={(event) => setMinimumViralScore(event.target.value)} type="number" min="0" max="100" placeholder={t("admin.rag.searchPlayground.minViralScorePlaceholder")} />
            <Input value={topK} onChange={(event) => setTopK(event.target.value)} type="number" min="1" max="50" placeholder={t("admin.rag.searchPlayground.topKPlaceholder")} />
          </div>
          <Button type="button" className="max-md:w-full" onClick={runSearch} disabled={isSearching}><Search className="size-4" /> {isSearching ? t("admin.rag.searchPlayground.searching") : t("admin.rag.searchPlayground.runRetrieval")}</Button>
        </CardContent>
      </Card>

      {diagnostics && (
        <>
          <div className="grid gap-3 max-md:grid-cols-2 max-md:gap-2 sm:grid-cols-2 lg:grid-cols-5 max-md:[&>:last-child]:col-span-2">
            <Metric label={t("admin.rag.searchPlayground.metricDuration")} value={`${diagnostics.durationMs.toFixed(0)} ms`} />
            <Metric label={t("admin.rag.searchPlayground.metricVectorCandidates")} value={String(diagnostics.vectorCandidateCount)} />
            <Metric label={t("admin.rag.searchPlayground.metricLexicalCandidates")} value={String(diagnostics.lexicalCandidateCount)} />
            <Metric label={t("admin.rag.searchPlayground.metricAfterMetadata")} value={String(diagnostics.metadataMatchedCandidateCount)} />
            <Metric label={t("admin.rag.searchPlayground.metricFinalResults")} value={String(diagnostics.results.length)} />
          </div>
          <div className="space-y-3">
            {diagnostics.results.map((item, index) => (
              <Card key={item.result.chunkId} className="border-ink-200 bg-card shadow-sm">
                <CardContent className="space-y-3 pt-5 max-md:px-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Badge variant="outline">#{index + 1}</Badge><h3 className="text-ink-900 text-sm font-bold">{item.result.title}</h3></div>
                    <Badge variant="outline">{t("admin.rag.searchPlayground.finalScore", { score: item.finalScore.toFixed(3) })}</Badge>
                  </div>
                  <p className="text-ink-600 text-xs leading-5">{item.result.content}</p>
                  <div className="text-ink-500 grid gap-2 text-[11px] max-md:grid-cols-2 sm:grid-cols-5">
                    <Score label={t("admin.rag.searchPlayground.scoreSemantic")} value={item.semanticScore} />
                    <Score label={t("admin.rag.searchPlayground.scoreLexical")} value={item.lexicalScore} />
                    <Score label={t("admin.rag.searchPlayground.scoreViral")} value={item.viralScore} />
                    <Score label={t("admin.rag.searchPlayground.scoreFreshness")} value={item.freshnessScore} />
                    <Score label={t("admin.rag.searchPlayground.scoreSimilarity")} value={item.result.similarity} />
                  </div>
                  <div className="text-ink-400 flex flex-wrap gap-2 text-[10px] max-md:[overflow-wrap:anywhere]"><span>{t("admin.rag.searchPlayground.sourceLine", { sourceId: item.result.sourceId ?? "—" })}</span><span>{t("admin.rag.searchPlayground.chunkLine", { chunkId: item.result.chunkId })}</span>{item.result.sourceUrl && <a className="text-ink-700 underline-offset-2 hover:underline" href={item.result.sourceUrl} target="_blank" rel="noreferrer">{t("admin.rag.searchPlayground.openSource")}</a>}</div>
                </CardContent>
              </Card>
            ))}
            {diagnostics.results.length === 0 && <Card><CardContent className="text-ink-500 pt-5 text-sm">{t("admin.rag.searchPlayground.noMatchingChunks")}</CardContent></Card>}
          </div>
        </>
      )}
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => <Card className="border-ink-200 bg-card shadow-sm"><CardContent className="pt-4"><p className="text-ink-400 text-[10px] font-bold tracking-wide uppercase">{label}</p><p className="text-ink-900 mt-1 text-lg font-bold">{value}</p></CardContent></Card>;
const Score = ({ label, value }: { label: string; value: number }) => <span><strong className="text-ink-700">{label}:</strong> {value.toFixed(3)}</span>;

export { RagSearchPlayground };
