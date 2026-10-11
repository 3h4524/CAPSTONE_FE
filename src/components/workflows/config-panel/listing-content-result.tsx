"use client";

import { FileText, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

import { evaluateListingSeo, generateListingContent } from "@/api/listing-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/helpers/toast";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { readString } from "@/helpers/workflow-config";
import { useWorkflowStore } from "@/stores/workflow";
import type { ListingContentResult, ListingSeoFeedback, ListingSeoScoreResult } from "@/types/listing-content";

export const ListingContentResultPanel = () => {
  const productId = useWorkflowStore((state) => readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.productId));
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const { run } = useWorkflowRuntime();
  const mutation = useMutation<ListingContentResult, { productId: string; seoFeedback?: ListingSeoFeedback }>({
    mutationFn: ({ productId: id, seoFeedback }) => generateListingContent(id, seoFeedback),
    onSuccess: () => showToast("success", "Listing content generated successfully."),
  });
  const seoMutation = useMutation<ListingSeoScoreResult, string>({
    mutationFn: evaluateListingSeo,
    onSuccess: (score) => showToast("success", `SEO score evaluated: ${score.overallScore}/100.`),
  });

  const generate = () => {
    if (!productId) {
      showToast("error", "Choose a product in Product input before generating listing content.");
      return;
    }
    mutation.mutate({ productId, seoFeedback: seoMutation.data ?? undefined });
  };

  const workflowOutput = run?.nodes.find((node) => node.nodeType === "generate-listing")?.output as Partial<ListingContentResult> | undefined;
  const result = mutation.data ?? (workflowOutput?.title ? workflowOutput as ListingContentResult : undefined);
  const seo = seoMutation.data;

  const evaluateSeo = () => {
    if (!productId) {
      showToast("error", "Choose a product before evaluating SEO.");
      return;
    }
    seoMutation.mutate(productId);
  };

  const recommendationLabel = seo?.recommendation === "regenerate"
    ? "Regenerate recommended"
    : seo?.recommendation === "keep"
      ? "Good to keep"
      : "Review recommended";

  return (
    <section className="space-y-4 rounded-lg border bg-slate-50/60 p-4" aria-label="Listing content result">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-violet-600" />
            <h3 className="text-sm font-semibold">Listing result</h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Generate content for the product selected in Product input.
          </p>
        </div>
        <Button type="button" size="sm" onClick={generate} disabled={isRunning || mutation.isPending}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {mutation.isPending ? "Generating…" : result ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {!productId && <p className="text-muted-foreground text-xs">Select a product in the Product input node first.</p>}
      {result && (
        <div className="space-y-4">
          <div className="rounded-md border bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600" />
                <p className="text-sm font-semibold">SEO evaluation</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={evaluateSeo} disabled={seoMutation.isPending}>
                {seoMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {seoMutation.isPending ? "Checking…" : "Check SEO score"}
              </Button>
            </div>
            {seo && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600">Overall score</span>
                  <span className={`text-lg font-bold ${seo.shouldRegenerate ? "text-amber-600" : "text-emerald-600"}`}>
                    {seo.overallScore}/100
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    ["Title", seo.titleScore],
                    ["Tags", seo.tagsScore],
                    ["Description", seo.descriptionScore],
                    ["Keywords", seo.keywordOptimizationScore],
                    ["Tag relevance", seo.tagRelevanceScore],
                    ["Keyword density", seo.keywordDensity],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between rounded bg-slate-50 px-2 py-1.5">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-medium">{value}/100</span>
                    </div>
                  ))}
                </div>
                <p className={`text-xs font-medium ${seo.shouldRegenerate ? "text-amber-700" : "text-emerald-700"}`}>
                  {recommendationLabel}
                </p>
                {seo.improvementSuggestions.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600">
                    {seo.improvementSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Title</p>
            <p className="rounded-md border bg-white p-2 text-sm font-medium">{result.title}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-600">Description</p>
            <Textarea readOnly value={result.description} className="min-h-32 resize-y bg-white text-sm leading-6" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-600">Tags</p>
              <span className="text-muted-foreground text-[11px]">{result.tags.length}/13</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.tags.map((tag) => <Badge key={`${tag.position}-${tag.value}`} variant="secondary">{tag.value}</Badge>)}
            </div>
          </div>
          <p className="text-muted-foreground text-[11px]">Generated with {result.model} · version {result.versionNumber}</p>
        </div>
      )}
    </section>
  );
};
