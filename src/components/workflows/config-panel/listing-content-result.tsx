"use client";

import { useState } from "react";
import { FileText, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { evaluateListingSeo, generateListingContent, getListingContent } from "@/api/listing-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { hasFeature } from "@/helpers/plan-features";
import { showToast } from "@/helpers/toast";
import { readString } from "@/helpers/workflow-config";
import { toProductOptions } from "@/helpers/workflow-panel";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { useWorkflowRunAction } from "@/hooks/mutations/use-workflow-run-action";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useEntitlements } from "@/hooks/queries/use-entitlements";
import { useQuery } from "@/hooks/queries/use-query";
import { useListingStream } from "@/hooks/use-listing-stream";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import type { ListingContentResult, ListingSeoFeedback, ListingSeoScoreResult } from "@/types/listing-content";

export const ListingContentResultPanel = () => {
  const { t } = useTranslation("common");
  const inputProductId = useWorkflowStore((state) => readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.productId));
  const batchId = useWorkflowStore((state) => readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId));
  // Each product of the batch has a listing of its own, written from its own details: the seller picks whose to see.
  const { data: products, isPending: productsPending, isError: productsFailed, refetch: refetchProducts } = useBatchProducts(batchId);
  const [chosenProductId, setChosenProductId] = useState("");
  // The product picked here while it is still in the batch; else the one Product input names; else the batch's first.
  const productId = chosenProductId && products?.some((product) => product.id === chosenProductId)
    ? chosenProductId
    : inputProductId || products?.[0]?.id || "";
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
          stage: t("workflowConfig.listing.stageRegenerating"),
          progress: 0,
        });
      }
    },
    onSuccess: (listing, variables) => {
      client.setQueryData(["listing-content", variables.productId], listing);
      if (listingNodeId) {
        setNodeRuntime(listingNodeId, {
          status: "success",
          stage: t("workflowConfig.listing.stageGenerated"),
          progress: 100,
        });
      }
      showToast("success", t("workflowConfig.listing.generatedToast"));
    },
    onSettled: (_listing, error) => {
      if (error && listingNodeId) {
        setNodeRuntime(listingNodeId, {
          status: "failed",
          stage: t("workflowConfig.listing.stageFailed"),
          progress: 0,
        });
      }
    },
  });
  const seoMutation = useMutation<ListingSeoScoreResult, string>({
    mutationFn: evaluateListingSeo,
    onSuccess: (score) => showToast("success", t("workflowConfig.listing.seoEvaluatedToast", { score: score.overallScore })),
  });

  const generate = () => {
    if (!productId) {
      showToast("error", t("workflowConfig.listing.chooseProductToGenerate"));
      return;
    }
    mutation.mutate({ productId, seoFeedback: seoMutation.data ?? undefined });
    // The score belongs to the version being replaced; its feedback goes into the new one.
    seoMutation.reset();
  };

  const chooseProduct = (next: string) => {
    setChosenProductId(next);
    // A score belongs to the listing it was taken of.
    seoMutation.reset();
  };

  const { mutate: act, isPending: isRetrying } = useWorkflowRunAction();
  const { openStream: openListingStream } = useListingStream();
  const listingStep = run?.nodes.find((node) => node.nodeType === "generate-listing");
  const workflowOutput = listingStep?.output as Partial<ListingContentResult> | undefined;
  // The listing failing does not stop the video, so it is written again from here while the run goes on.
  const failedInRun = listingStep?.status === "failed" && !mutation.data && run?.productId === productId;
  const fromRun = workflowOutput?.title && (!productId || run?.productId === productId) ? workflowOutput as ListingContentResult : undefined;
  const stored = saved && fromRun ? (saved.versionNumber >= fromRun.versionNumber ? saved : fromRun) : saved ?? fromRun;
  // A listing just written for another product is not this one's.
  const result = (mutation.variables?.productId === productId ? mutation.data : undefined) ?? stored;
  // While the designs and mock-ups are being made, the run that follows is about to write the listing itself,
  // and two listings written at once for a product would clash. Once that run exists its listing is done, so
  // regenerating here is safe again and does not affect the video.
  const waitingForRunToStart = isRunning && !runIsOpen;
  const seo = seoMutation.data;
  // The first listing of a product is in every plan; writing it again and scoring its SEO are Pro.
  const { data: entitlements } = useEntitlements();
  const canRegenerate = entitlements === undefined || hasFeature(entitlements, "listing_regenerate");
  // Listing content itself is not on Starter.
  const listingLocked = entitlements !== undefined && !hasFeature(entitlements, "workflow_listing");
  const regenerateLocked = listingLocked || (Boolean(result) && !canRegenerate);

  const evaluateSeo = () => {
    if (!productId) {
      showToast("error", t("workflowConfig.listing.chooseProductToEvaluate"));
      return;
    }
    seoMutation.mutate(productId);
  };

  const recommendationLabel = seo?.recommendation === "regenerate"
    ? t("workflowConfig.listing.regenerateRecommended")
    : seo?.recommendation === "keep"
      ? t("workflowConfig.listing.goodToKeep")
      : t("workflowConfig.listing.reviewRecommended");

  return (
    <section className="bg-ink-50/60 space-y-4 rounded-lg border p-4" aria-label={t("workflowConfig.listing.sectionAria")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-violet-600 dark:text-violet-400" />
            <h3 className="text-sm font-semibold">{t("workflowConfig.listing.title")}</h3>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            {(products?.length ?? 0) > 1
              ? t("workflowConfig.listing.batchDescription", { defaultValue: "Each product of the batch has its own listing. Choose one to see or regenerate it." })
              : t("workflowConfig.listing.description")}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={generate}
          disabled={waitingForRunToStart || mutation.isPending || isRetrying || regenerateLocked}
          title={listingLocked ? t("workflowConfig.listing.listingPro") : regenerateLocked ? t("workflowConfig.listing.regeneratePro") : undefined}
        >
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {mutation.isPending ? t("workflowConfig.listing.generating") : result ? t("workflowConfig.listing.regenerate") : t("workflowConfig.listing.generate")}
          {regenerateLocked && <Badge variant="outline" className="ml-1 text-[10px]">Pro</Badge>}
        </Button>
      </div>

      {(products?.length ?? 0) > 1 && (
        <div className="space-y-1.5">
          <Label htmlFor="listing-content-product">{t("workflowConfig.listing.product", { defaultValue: "Product" })}</Label>
          <OptionSelect
            standaloneId="listing-content-product"
            value={productId}
            onChange={chooseProduct}
            options={toProductOptions(products)}
            placeholder={t("workflowConfig.listing.chooseProduct", { defaultValue: "Choose a product" })}
            isLoading={Boolean(batchId) && productsPending}
            isError={productsFailed}
            onRetry={() => void refetchProducts()}
            disabled={mutation.isPending}
          />
        </div>
      )}
      {!productId && <p className="text-muted-foreground text-xs">{t("workflowConfig.listing.selectProductFirst")}</p>}
      {productId && !result && !mutation.isPending && !failedInRun && !waitingForRunToStart && (
        <p className="text-muted-foreground text-xs">{t("workflowConfig.listing.noListingYet", { defaultValue: "This product has no listing yet." })}</p>
      )}
      {waitingForRunToStart && <p className="text-muted-foreground text-xs">{t("workflowConfig.listing.availableAfterDesigns")}</p>}
      {failedInRun && run && (
        <div className="space-y-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10" role="alert">
          <p className="text-xs text-red-800 dark:text-red-300">{listingStep?.errorMessage ?? t("workflowConfig.listing.failed")}</p>
          {run.status !== "cancelled" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isRetrying || mutation.isPending || run.status === "running"}
              onClick={() =>
                act({
                  runId: run.id,
                  expectedRevision: run.revision,
                  action: "retry_listing",
                  listingStreamId: openListingStream(),
                })
              }
            >
              {isRetrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              {isRetrying ? t("workflowConfig.listing.generating") : t("workflowConfig.listing.tryAgain")}
            </Button>
          )}
          {run.status === "running" && <p className="text-muted-foreground text-xs">{t("workflowConfig.listing.availableAfterVideo")}</p>}
        </div>
      )}
      {result && (
        <div className="space-y-4">
          <div className="bg-card rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                <p className="text-sm font-semibold">{t("workflowConfig.listing.seoEvaluation")}</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={evaluateSeo}
                disabled={seoMutation.isPending || !canRegenerate}
                title={canRegenerate ? undefined : t("workflowConfig.listing.seoPro")}
              >
                {seoMutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {seoMutation.isPending ? t("workflowConfig.listing.checking") : t("workflowConfig.listing.checkSeo")}
                {!canRegenerate && <Badge variant="outline" className="ml-1 text-[10px]">Pro</Badge>}
              </Button>
            </div>
            {seo && (
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-ink-600 text-xs">{t("workflowConfig.listing.overallScore")}</span>
                  <span className={`text-lg font-bold ${seo.shouldRegenerate ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                    {seo.overallScore}/100
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(
                    [
                      ["title", seo.titleScore, "/100"],
                      ["tags", seo.tagsScore, "/100"],
                      ["description", seo.descriptionScore, "/100"],
                      ["keywords", seo.keywordOptimizationScore, "/100"],
                      ["tagRelevance", seo.tagRelevanceScore, "/100"],
                      // A share of the description's words, not a score.
                      ["keywordDensity", seo.keywordDensity, "%"],
                    ] as const
                  ).map(([label, value, unit]) => (
                    <div key={label} className="bg-ink-50 flex justify-between rounded px-2 py-1.5">
                      <span className="text-ink-500">{t(`workflowConfig.listing.scores.${label}`)}</span>
                      <span className="font-medium">{value}{unit}</span>
                    </div>
                  ))}
                </div>
                <p className={`text-xs font-medium ${seo.shouldRegenerate ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-300"}`}>
                  {recommendationLabel}
                </p>
                {seo.improvementSuggestions.length > 0 && (
                  <ul className="text-ink-600 list-disc space-y-1 pl-4 text-xs">
                    {seo.improvementSuggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-ink-600 text-xs font-medium">{t("workflowConfig.listing.scores.title")}</p>
            <p className="bg-card rounded-md border p-2 text-sm font-medium">{result.title}</p>
          </div>
          <div className="space-y-1">
            <p className="text-ink-600 text-xs font-medium">{t("workflowConfig.listing.scores.description")}</p>
            <Textarea readOnly value={result.description} className="bg-card min-h-32 resize-y text-sm leading-6" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-ink-600 text-xs font-medium">{t("workflowConfig.listing.scores.tags")}</p>
              <span className="text-muted-foreground text-[11px]">{result.tags.length}/13</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.tags.map((tag) => <Badge key={`${tag.position}-${tag.value}`} variant="secondary">{tag.value}</Badge>)}
            </div>
          </div>
          <p className="text-muted-foreground text-[11px]">{t("workflowConfig.listing.generatedWith", { model: result.model, version: result.versionNumber })}</p>
        </div>
      )}
    </section>
  );
};
