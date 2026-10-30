"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";

import { searchRagWithDiagnostics, type RagSearchDiagnostics, type RagSearchRequest } from "@/api/rag";
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
    <div className="space-y-5">
      <div>
        <p className="text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase">Correctness lab</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Search playground</h2>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
          Run a real retrieval query and inspect vector, lexical, metadata, and reranking signals.
        </p>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <CardTitle className="flex items-center gap-2 text-sm"><SlidersHorizontal className="size-4 text-indigo-500" /> Query and filters</CardTitle>
          <CardDescription className="mt-1 text-xs">These values are sent to the live admin diagnostics endpoint.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <Textarea value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. botanical gift for plant lovers" className="min-h-24 text-sm" />
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Input value={contentType} onChange={(event) => setContentType(event.target.value)} placeholder="Content type" />
            <Input value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="Platform" />
            <Input value={niche} onChange={(event) => setNiche(event.target.value)} placeholder="Niche" />
            <Input value={minimumViralScore} onChange={(event) => setMinimumViralScore(event.target.value)} type="number" min="0" max="100" placeholder="Min viral score" />
            <Input value={topK} onChange={(event) => setTopK(event.target.value)} type="number" min="1" max="50" placeholder="Top K" />
          </div>
          <Button type="button" onClick={runSearch} disabled={isSearching}><Search className="size-4" /> {isSearching ? "Searching…" : "Run retrieval"}</Button>
        </CardContent>
      </Card>

      {diagnostics && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Duration" value={`${diagnostics.durationMs.toFixed(0)} ms`} />
            <Metric label="Vector candidates" value={String(diagnostics.vectorCandidateCount)} />
            <Metric label="Lexical candidates" value={String(diagnostics.lexicalCandidateCount)} />
            <Metric label="After metadata" value={String(diagnostics.metadataMatchedCandidateCount)} />
            <Metric label="Final results" value={String(diagnostics.results.length)} />
          </div>
          <div className="space-y-3">
            {diagnostics.results.map((item, index) => (
              <Card key={item.result.chunkId} className="border-slate-200 bg-white shadow-sm">
                <CardContent className="space-y-3 pt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><Badge variant="outline">#{index + 1}</Badge><h3 className="text-sm font-bold text-slate-900">{item.result.title}</h3></div>
                    <Badge className="bg-indigo-50 text-indigo-700">Final {item.finalScore.toFixed(3)}</Badge>
                  </div>
                  <p className="text-xs leading-5 text-slate-600">{item.result.content}</p>
                  <div className="grid gap-2 text-[11px] text-slate-500 sm:grid-cols-5">
                    <Score label="Semantic" value={item.semanticScore} />
                    <Score label="Lexical" value={item.lexicalScore} />
                    <Score label="Viral" value={item.viralScore} />
                    <Score label="Freshness" value={item.freshnessScore} />
                    <Score label="Similarity" value={item.result.similarity} />
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px] text-slate-400"><span>Source: {item.result.sourceId ?? "—"}</span><span>Chunk: {item.result.chunkId}</span>{item.result.sourceUrl && <a className="text-indigo-600 hover:underline" href={item.result.sourceUrl} target="_blank" rel="noreferrer">Open source</a>}</div>
                </CardContent>
              </Card>
            ))}
            {diagnostics.results.length === 0 && <Card><CardContent className="pt-5 text-sm text-slate-500">No matching chunks were retrieved.</CardContent></Card>}
          </div>
        </>
      )}
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => <Card className="border-slate-200 bg-white shadow-sm"><CardContent className="pt-4"><p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{label}</p><p className="mt-1 text-lg font-bold text-slate-900">{value}</p></CardContent></Card>;
const Score = ({ label, value }: { label: string; value: number }) => <span><strong className="text-slate-700">{label}:</strong> {value.toFixed(3)}</span>;

export { RagSearchPlayground };
