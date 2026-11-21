"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DesignTextCheckNote } from "@/components/batch-jobs/design-text-check-note";
import { ImageLightbox } from "@/components/commons/data-display/image-lightbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { designLightboxImages } from "@/helpers/lightbox-images";
import { productTypeLabel } from "@/helpers/mockup-template";
import {
  countApprovals,
  DESIGNS_READY_STATUSES,
  estimateMockupCount,
  extractMockupSelection,
  productsAwaitingReview,
} from "@/helpers/workflow-run";
import { useSetImageApproval } from "@/hooks/mutations/use-set-image-approval";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { applySelectionAndGenerateMockups } from "@/hooks/use-batch-run";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { BatchJobDetail, ImageApprovalStatus } from "@/types/batch-jobs";
import { cn } from "@/utils/cn";

const STATUS_BADGES: Record<ImageApprovalStatus, { className: string; labelKey: string }> = {
  approved: {
    className: "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    labelKey: "workflowEditor.mockupStrip.approved",
  },
  rejected: {
    className: "bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300",
    labelKey: "workflowEditor.mockupStrip.rejected",
  },
  pending: {
    className: "bg-ink-100 text-ink-600",
    labelKey: "workflowEditor.mockupStrip.toReview",
  },
};

const toStatus = (value: string): ImageApprovalStatus =>
  value === "approved" || value === "rejected" ? value : "pending";

// SRS 3.5.12: where the person looks at every generated design and decides which ones continue to the
// mock-up step. Decisions are saved on the server as they are made; "Continue" then asks for the mock-ups.
export const ApprovalReviewPanel = ({ job }: { job: BatchJobDetail }) => {
  const { t } = useTranslation("common");
  const queryClient = useAppQueryClient();
  const approval = useSetImageApproval();
  const mockupState = useWorkflowRunStore((state) => state.mockupState);
  const nodes = useWorkflowStore((state) => state.nodes);
  const { data: templates } = useMockupTemplates();
  const [viewing, setViewing] = useState<number | null>(null);

  const designsReady = DESIGNS_READY_STATUSES.includes(job.status);
  // With automatic approval, the products whose designs the content check could not look at wait for the Seller:
  // they are reviewed here like a manual run (approving checks the design again).
  const held = job.requireApproval === false && designsReady ? productsAwaitingReview(job) : [];
  const manual = job.requireApproval === true || held.length > 0;
  const reviewed = held.length > 0 ? { ...job, products: held } : job;
  const counts = countApprovals(reviewed);
  const mockupNode = nodes.find((node) => node.data.type === "apply-mockup");
  const selection = mockupNode ? extractMockupSelection(mockupNode.data.config) : null;
  const estimate = selection && templates ? estimateMockupCount(reviewed, selection, templates) : null;
  const makingMockups = mockupState === "running";

  const decide = (designImageIds: string[] | null, status: ImageApprovalStatus) =>
    approval.mutate({ batchJobId: job.id, designImageIds, status });

  if (!manual) {
    return (
      <section
        className="space-y-3 border-t pt-5"
        aria-label={t("workflowEditor.approvalReview.approval")}
      >
        <h3 className="text-ink-900 text-sm font-semibold">
          {t("workflowEditor.approvalReview.approval")}
        </h3>
        <PanelNotice tone="info">
          {job.requireApproval === false
            ? t("workflowEditor.approvalReview.autoApproved")
            : t("workflowEditor.approvalReview.startedBeforeReview")}
        </PanelNotice>
      </section>
    );
  }

  if (!designsReady) {
    return (
      <section
        className="space-y-3 border-t pt-5"
        aria-label={t("workflowEditor.approvalReview.approval")}
      >
        <h3 className="text-ink-900 text-sm font-semibold">
          {t("workflowEditor.approvalReview.reviewDesigns")}
        </h3>
        <PanelNotice>{t("workflowEditor.approvalReview.stillGenerating")}</PanelNotice>
      </section>
    );
  }

  const productsWithImages = reviewed.products.filter((product) => product.images.length > 0);
  const gallery = designLightboxImages(productsWithImages);

  return (
    <section className="space-y-4" aria-label={t("workflowEditor.approvalReview.reviewDesigns")}>
      {held.length > 0 && (
        <PanelNotice tone="warning">
          {t("workflowEditor.approvalReview.heldForReview", { count: held.length })}
        </PanelNotice>
      )}
      <div className="bg-card/95 sticky top-0 z-10 -mx-5 space-y-3 border-y px-5 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-ink-900 text-sm font-semibold">
            {t("workflowEditor.approvalReview.reviewDesigns")}
          </h3>
          <p
            className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums"
            aria-live="polite"
          >
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              {t("workflowEditor.approvalReview.approvedCount", { count: counts.approved })}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-rose-500" aria-hidden="true" />
              {t("workflowEditor.approvalReview.rejectedCount", { count: counts.rejected })}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="bg-ink-400 size-1.5 rounded-full" aria-hidden="true" />
              {t("workflowEditor.runGroup.toReviewCount", { count: counts.pending })}
            </span>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 @xs:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 hover:translate-y-0"
            disabled={counts.pending === 0 || approval.isPending}
            onClick={() => decide(null, "approved")}
          >
            {t("workflowEditor.approvalReview.approveRemaining", { count: counts.pending })}
          </Button>
          {mockupNode && (
            <Button
              type="button"
              size="sm"
              className="h-8 px-3 hover:translate-y-0"
              disabled={
                counts.approved === 0 || makingMockups || (selection?.templateIds.length ?? 0) === 0
              }
              onClick={() => void applySelectionAndGenerateMockups(job.id, queryClient)}
            >
              {makingMockups
                ? t("workflowEditor.approvalReview.makingMockups")
                : mockupState === "idle"
                  ? t("workflowEditor.approvalReview.continueToMockups")
                  : t("workflowEditor.approvalReview.updateMockups")}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          {!mockupNode
            ? t("workflowEditor.approvalReview.addApplyMockup")
            : (selection?.templateIds.length ?? 0) === 0
              ? t("workflowEditor.approvalReview.chooseTemplates")
              : counts.approved === 0
                ? t("workflowEditor.approvalReview.approveOne")
                : estimate !== null
                  ? t("workflowEditor.approvalReview.estimate", {
                      count: estimate,
                      designs: t("workflowEditor.approvalReview.approvedDesigns", {
                        count: counts.approved,
                      }),
                    })
                  : t("workflowEditor.approvalReview.willGoToMockups", {
                      designs: t("workflowEditor.approvalReview.approvedDesigns", {
                        count: counts.approved,
                      }),
                    })}
        </p>
      </div>

      {productsWithImages.length === 0 && (
        <p className="text-muted-foreground text-xs">
          {t("workflowEditor.approvalReview.noDesigns")}
        </p>
      )}
      {productsWithImages.map((product) => {
        const allApproved = product.images.every((image) => image.approvalStatus === "approved");
        return (
          <div key={product.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <h4 className="truncate text-sm font-medium">{product.productName}</h4>
                {product.productType && (
                  <Badge variant="outline" className="border-ink-200 bg-ink-50 text-ink-700">
                    {productTypeLabel(product.productType)}
                  </Badge>
                )}
              </div>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0 text-xs"
                disabled={allApproved || approval.isPending}
                onClick={() =>
                  decide(
                    product.images.map((image) => image.id),
                    "approved"
                  )
                }
              >
                {t("workflowEditor.runGroup.approveAll")}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2 @2xl:grid-cols-3">
              {product.images.map((image, position) => {
                const status = toStatus(image.approvalStatus);
                const badge = STATUS_BADGES[status];
                const label = t("workflowEditor.approvalReview.variationLabel", {
                  name: product.productName,
                  number: position + 1,
                });
                return (
                  <div
                    key={image.id}
                    className={cn(
                      "overflow-hidden rounded-lg border",
                      status === "approved" && "border-emerald-300 dark:border-emerald-500/40",
                      status === "rejected" && "border-rose-300 opacity-70 dark:border-rose-500/40"
                    )}
                  >
                    {/* Opens the design large on the page rather than in a new tab. */}
                    <Button
                      type="button"
                      variant="none"
                      aria-label={t("workflowEditor.approvalReview.viewLarger", { label })}
                      onClick={() => setViewing(gallery.findIndex((item) => item.id === image.id))}
                      className="block h-auto w-full cursor-zoom-in overflow-hidden rounded-none p-0 hover:translate-y-0"
                    >
                      <Image
                        src={image.imageUrl}
                        alt={label}
                        width={image.widthPx || 512}
                        height={image.heightPx || 512}
                        unoptimized
                        className="bg-muted aspect-square w-full object-cover"
                      />
                    </Button>
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 p-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
                          badge.className
                        )}
                      >
                        {t(badge.labelKey)}
                      </span>
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant={status === "approved" ? "default" : "outline"}
                          size="icon-sm"
                          aria-label={
                            status === "approved"
                              ? t("workflowEditor.approvalReview.takeBackApproval", { label })
                              : t("workflowEditor.approvalReview.approveLabel", { label })
                          }
                          aria-pressed={status === "approved"}
                          disabled={approval.isPending}
                          onClick={() =>
                            decide([image.id], status === "approved" ? "pending" : "approved")
                          }
                        >
                          <Check aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant={status === "rejected" ? "destructive" : "outline"}
                          size="icon-sm"
                          aria-label={
                            status === "rejected"
                              ? t("workflowEditor.approvalReview.takeBackRejection", { label })
                              : t("workflowEditor.approvalReview.rejectLabel", { label })
                          }
                          aria-pressed={status === "rejected"}
                          disabled={approval.isPending}
                          onClick={() =>
                            decide([image.id], status === "rejected" ? "pending" : "rejected")
                          }
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                    <DesignTextCheckNote check={image.textCheck} className="px-2 pb-2" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <ImageLightbox images={gallery} index={viewing} onIndexChange={setViewing} />
    </section>
  );
};
