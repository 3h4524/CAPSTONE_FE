"use client";

import { FileText, Loader2, RefreshCw, ShieldCheck } from "lucide-react";

import { evaluateListingSeo, generateListingContent, getListingContent } from "@/api/listing-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/helpers/toast";
import { readString } from "@/helpers/workflow-config";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useQuery } from "@/hooks/queries/use-query";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import type { ListingContentResult, ListingSeoFeedback, ListingSeoScoreResult } from "@/types/listing-content";

export const ListingContentResultPanel = () => {
  const productId = useWorkflowStore((state) => readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.productId));
  const listingNodeId = useWorkflowStore(
    (state) => state.nodes.find((node) => node.data.type === "generate-listing")?.id
  );
  const setNodeRuntime = useWorkflowStore((state) => state.setNodeRuntime);
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const { run, isRunning: runIsOpen } = useWorkflowRuntime();
  const client = useAppQueryClient();
  // The newest listing of the product. A run only knows the one it wrote itself, so without this a page that
  // is reloaded would show that one again after the listing was regenerated here.
  const { data: saved } = useQuery<ListingContentResult>({
    queryKey: ["listing-content", productId],
    queryFn: () => getListingContent(productId),
    enabled: Boolean(productId),
    // A product without a listing yet answers 404, which is not a problem to report.
    suppressErrorToast: true,
  });
  const mutation = useMutation<ListingContentResult, { productId: string; seoFeedback?: ListingSeoFeedback }>({
    mutationFn: ({ productId: id, seoFeedback }) => generateListingContent(id, seoFeedback),
    onMutate: () => {
      if (listingNodeId) {
        setNodeRuntime(listingNodeId, {
          status: "running",
          stage: "Regenerating listing content",
          progress: 0,
        });
      }
    },
    onSuccess: (listing, variables) => {
      client.setQueryData(["listing-content", variables.productId], listing);
      if (listingNodeId) {
        setNodeRuntime(listingNodeId, {
          status: "success",
          stage: "Generated",
          progress: 100,
        });
      }
      showToast("success", "Listing content generated successfully.");
    },
    onSettled: (_listing, error) => {
      if (error && listingNodeId) {
        setNodeRuntime(listingNodeId, {
          status: "failed",
          stage: "Generation failed",
          progress: 0,
        });
      }
    },
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

  const { mutate: act, isPending: isRetrying } = useWorkflowRunAction();
  const listingStep = run?.nodes.find((node) => node.nodeType === "generate-listing");
  const workflowOutput = listingStep?.output as Partial<ListingContentResult> | undefined;
  // The listing failing does not stop the video, so it is written again from here while the run goes on.
  const failedInRun = listingStep?.status === "failed" && !mutation.data;
  const fromRun = workflowOutput?.title && (!productId || run?.productId === productId) ? workflowOutput as ListingContentResult : undefined;
  const stored = saved && fromRun ? (saved.versionNumber >= fromRun.versionNumber ? saved : fromRun) : saved ?? fromRun;
  const result = mutation.data ?? stored;
  // While the designs and mock-ups are being made, the run that follows is about to write the listing itself,
  // and two listings written at once for a product would clash. Once that run exists its listing is done, so
  // regenerating here is safe again and does not affect the video.
  const waitingForRunToStart = isRunning && !runIsOpen;
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
        <Button type="button" size="sm" onClick={generate} disabled={waitingForRunToStart || mutation.isPending || isRetrying}>
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {mutation.isPending ? "Generating…" : result ? "Regenerate" : "Generate"}
        </Button>
      </div>

      {!productId && <p className="text-muted-foreground text-xs">Select a product in the Product input node first.</p>}
      {waitingForRunToStart && <p className="text-muted-foreground text-xs">Available once the designs and mock-ups are done: the run writes the listing itself then.</p>}
      {failedInRun && run && (
        <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3" role="alert">
          <p className="text-xs text-red-800">{listingStep?.errorMessage ?? "Listing content could not be generated."}</p>
          {run.status !== "cancelled" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isRetrying || mutation.isPending || run.status === "running"}
              onClick={() => act({ runId: run.id, expectedRevision: run.revision, action: "retry_listing" })}
            >
              {isRetrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {isRetrying ? "Generating…" : "Try again"}
            </Button>
          )}
          {run.status === "running" && <p className="text-muted-foreground text-xs">Available once the video step is waiting for you or has finished.</p>}
        </div>
      )}
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
