"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { type RagSearchDiagnostics, type RagSearchRequest,searchRagWithDiagnostics } from "@/api/rag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/helpers/toast";

const RagSearchPlayground = () => {
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
      showToast("error", "Enter a query before searching.");
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
      showToast("error", "RAG search failed. Check the API and embedding configuration.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-5 max-md:space-y-3">
      <div>
        <p className="text-ink-400 text-[10px] font-bold tracking-[0.16em] uppercase">Correctness lab</p>
        <h2 className="text-ink-900 mt-1 text-2xl font-bold tracking-tight max-md:text-xl">Search playground</h2>
        <p className="text-ink-500 mt-1 max-w-2xl text-xs leading-5">
          Run a real retrieval query and inspect vector, lexical, metadata, and reranking signals.
        </p>
      </div>

      <Card className="border-ink-200 bg-card shadow-sm">
        <CardHeader className="border-ink-100 border-b pb-4 max-md:px-4">
          <CardTitle className="flex items-center gap-2 text-sm"><SlidersHorizontal className="text-ink-500 size-4" /> Query and filters</CardTitle>
          <CardDescription className="mt-1 text-xs">These values are sent to the live admin diagnostics endpoint.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5 max-md:px-4">
          <Textarea value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. botanical gift for plant lovers" className="min-h-24 text-sm max-md:text-base" />
          <div className="grid gap-3 max-md:grid-cols-2 max-md:gap-2 md:grid-cols-2 lg:grid-cols-5 max-md:[&>:last-child]:col-span-2">
            <Input value={contentType} onChange={(event) => setContentType(event.target.value)} placeholder="Content type" />
            <Input value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="Platform" />
            <Input value={niche} onChange={(event) => setNiche(event.target.value)} placeholder="Niche" />
            <Input value={minimumViralScore} onChange={(event) => setMinimumViralScore(event.target.value)} type="number" min="0" max="100" placeholder="Min viral score" />
            <Input value={topK} onChange={(event) => setTopK(event.target.value)} type="number" min="1" max="50" placeholder="Top K" />
          </div>
          <Button type="button" className="max-md:w-full" onClick={runSearch} disabled={isSearching}><Search className="size-4" /> {isSearching ? "Searching…" : "Run retrieval"}</Button>
        </CardContent>
      </Card>

      {diagnostics && (
        <>
          <div className="grid gap-3 max-md:grid-cols-2 max-md:gap-2 sm:grid-cols-2 lg:grid-cols-5 max-md:[&>:last-child]:col-span-2">
            <Metric label="Duration" value={`${diagnostics.durationMs.toFixed(0)} ms`} />
            <Metric label="Vector candidates" value={String(diagnostics.vectorCandidateCount)} />
            <Metric label="Lexical candidates" value={String(diagnostics.lexicalCandidateCount)} />
            <Metric label="After metadata" value={String(diagnostics.metadataMatchedCandidateCount)} />
            <Metric label="Final results" value={String(diagnostics.results.length)} />
          </div>
          <div className="space-y-3">
            {diagnostics.results.map((item, index) => (
              <Card key={item.result.chunkId} className="border-ink-200 bg-card shadow-sm">
                <CardContent className="space-y-3 pt-5 max-md:px-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Badge variant="outline">#{index + 1}</Badge><h3 className="text-ink-900 text-sm font-bold">{item.result.title}</h3></div>
                    <Badge variant="outline">Final {item.finalScore.toFixed(3)}</Badge>
                  </div>
                  <p className="text-ink-600 text-xs leading-5">{item.result.content}</p>
                  <div className="text-ink-500 grid gap-2 text-[11px] max-md:grid-cols-2 sm:grid-cols-5">
                    <Score label="Semantic" value={item.semanticScore} />
                    <Score label="Lexical" value={item.lexicalScore} />
                    <Score label="Viral" value={item.viralScore} />
                    <Score label="Freshness" value={item.freshnessScore} />
                    <Score label="Similarity" value={item.result.similarity} />
                  </div>
                  <div className="text-ink-400 flex flex-wrap gap-2 text-[10px] max-md:[overflow-wrap:anywhere]"><span>Source: {item.result.sourceId ?? "—"}</span><span>Chunk: {item.result.chunkId}</span>{item.result.sourceUrl && <a className="text-ink-700 underline-offset-2 hover:underline" href={item.result.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}</div>
                </CardContent>
              </Card>
            ))}
            {diagnostics.results.length === 0 && <Card><CardContent className="text-ink-500 pt-5 text-sm">No matching chunks were retrieved.</CardContent></Card>}
          </div>
        </>
      )}
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => <Card className="border-ink-200 bg-card shadow-sm"><CardContent className="pt-4"><p className="text-ink-400 text-[10px] font-bold tracking-wide uppercase">{label}</p><p className="text-ink-900 mt-1 text-lg font-bold">{value}</p></CardContent></Card>;
const Score = ({ label, value }: { label: string; value: number }) => <span><strong className="text-ink-700">{label}:</strong> {value.toFixed(3)}</span>;

export { RagSearchPlayground };
