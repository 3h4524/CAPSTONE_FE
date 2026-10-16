"use client";

import Image from "next/image";
import { Check, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { productTypeLabel } from "@/helpers/mockup-template";
import {
  countApprovals,
  DESIGNS_READY_STATUSES,
  estimateMockupCount,
  extractMockupSelection,
} from "@/helpers/workflow-run";
import { useSetImageApproval } from "@/hooks/mutations/use-set-image-approval";
import { useMockupTemplates } from "@/hooks/queries/use-mockup-templates";
import { applySelectionAndGenerateMockups } from "@/hooks/use-batch-run";
import { useAppQueryClient } from "@/hooks/use-query-client";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { BatchJobDetail, ImageApprovalStatus } from "@/types/batch-jobs";
import { cn } from "@/utils/cn";

const STATUS_BADGES: Record<ImageApprovalStatus, { className: string; label: string }> = {
  approved: { className: "bg-emerald-100 text-emerald-700", label: "Approved" },
  rejected: { className: "bg-rose-100 text-rose-700", label: "Rejected" },
  pending: { className: "bg-slate-100 text-slate-600", label: "To review" },
};

const toStatus = (value: string): ImageApprovalStatus => (value === "approved" || value === "rejected" ? value : "pending");

// SRS 3.5.12: where the person looks at every generated design and decides which ones continue to the
// mock-up step. Decisions are saved on the server as they are made; "Continue" then asks for the mock-ups.
export const ApprovalReviewPanel = ({ job }: { job: BatchJobDetail }) => {
  const queryClient = useAppQueryClient();
  const approval = useSetImageApproval();
  const mockupState = useWorkflowRunStore((state) => state.mockupState);
  const nodes = useWorkflowStore((state) => state.nodes);
  const { data: templates } = useMockupTemplates();

  const counts = countApprovals(job);
  const manual = job.requireApproval === true;
  const designsReady = DESIGNS_READY_STATUSES.includes(job.status);
  const mockupNode = nodes.find((node) => node.data.type === "apply-mockup");
  const selection = mockupNode ? extractMockupSelection(mockupNode.data.config) : null;
  const estimate = selection && templates ? estimateMockupCount(job, selection, templates) : null;
  const makingMockups = mockupState === "running";

  const decide = (designImageIds: string[] | null, status: ImageApprovalStatus) =>
    approval.mutate({ batchJobId: job.id, designImageIds, status });

  if (!manual) {
    return (
      <section className="space-y-2" aria-label="Approval">
        <h3 className="text-sm font-semibold">Approval</h3>
        <p className="text-muted-foreground text-xs">
          {job.requireApproval === false
            ? "This run approves every design automatically, so they continue to the mock-ups without a review."
            : "This run started before designs could be reviewed, so they continue without approval."}
        </p>
      </section>
    );
  }

  if (!designsReady) {
    return (
      <section className="space-y-2" aria-label="Approval">
        <h3 className="text-sm font-semibold">Review designs</h3>
        <p className="text-muted-foreground text-xs">The designs are still being generated. You can review them as soon as the job finishes.</p>
      </section>
    );
  }

  const productsWithImages = job.products.filter((product) => product.images.length > 0);

  return (
    <section className="space-y-4" aria-label="Review designs">
      <div className="bg-background sticky top-0 z-10 -mx-4 -mt-4 space-y-2 border-b px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Review designs</h3>
          <p className="text-muted-foreground text-xs" aria-live="polite">
            {counts.approved} approved · {counts.rejected} rejected · {counts.pending} to review
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={counts.pending === 0 || approval.isPending}
            onClick={() => decide(null, "approved")}
          >
            Approve all remaining ({counts.pending})
          </Button>
          {mockupNode && (
            <Button
              type="button"
              size="sm"
              disabled={counts.approved === 0 || makingMockups || (selection?.templateIds.length ?? 0) === 0}
              onClick={() => void applySelectionAndGenerateMockups(job.id, queryClient)}
            >
              {makingMockups ? "Making mock-ups…" : mockupState === "idle" ? "Continue to mock-ups" : "Update mock-ups"}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          {!mockupNode
            ? "Add an Apply mock-up step to turn approved designs into mock-ups."
            : (selection?.templateIds.length ?? 0) === 0
              ? "Choose mock-up templates in the Apply mock-up node first."
              : counts.approved === 0
                ? "Approve at least one design to continue."
                : estimate !== null
                  ? `About ${estimate} mock-up${estimate === 1 ? "" : "s"} from ${counts.approved} approved design${counts.approved === 1 ? "" : "s"}.`
                  : `${counts.approved} approved design${counts.approved === 1 ? "" : "s"} will go to the mock-ups.`}
        </p>
      </div>

      {productsWithImages.length === 0 && <p className="text-muted-foreground text-xs">No designs were generated.</p>}
      {productsWithImages.map((product) => {
        const allApproved = product.images.every((image) => image.approvalStatus === "approved");
        return (
          <div key={product.id} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <h4 className="truncate text-sm font-medium">{product.productName}</h4>
                {product.productType && <Badge variant="secondary">{productTypeLabel(product.productType)}</Badge>}
              </div>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0 text-xs"
                disabled={allApproved || approval.isPending}
                onClick={() => decide(product.images.map((image) => image.id), "approved")}
              >
                Approve all
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2 @2xl:grid-cols-3">
              {product.images.map((image, position) => {
                const status = toStatus(image.approvalStatus);
                const badge = STATUS_BADGES[status];
                const label = `${product.productName}, variation ${position + 1}`;
                return (
                  <div
                    key={image.id}
                    className={cn(
                      "overflow-hidden rounded-lg border",
                      status === "approved" && "border-emerald-300",
                      status === "rejected" && "border-rose-300 opacity-70"
                    )}
                  >
                    <a href={image.imageUrl} target="_blank" rel="noreferrer" className="block">
                      <Image
                        src={image.imageUrl}
                        alt={label}
                        width={image.widthPx || 512}
                        height={image.heightPx || 512}
                        unoptimized
                        className="bg-muted aspect-square w-full object-cover"
                      />
                    </a>
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 p-2">
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", badge.className)}>
                        {badge.label}
                      </span>
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          variant={status === "approved" ? "default" : "outline"}
                          size="icon-sm"
                          aria-label={status === "approved" ? `Take back approval of ${label}` : `Approve ${label}`}
                          aria-pressed={status === "approved"}
                          disabled={approval.isPending}
                          onClick={() => decide([image.id], status === "approved" ? "pending" : "approved")}
                        >
                          <Check aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant={status === "rejected" ? "destructive" : "outline"}
                          size="icon-sm"
                          aria-label={status === "rejected" ? `Take back rejection of ${label}` : `Reject ${label}`}
                          aria-pressed={status === "rejected"}
                          disabled={approval.isPending}
                          onClick={() => decide([image.id], status === "rejected" ? "pending" : "rejected")}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
};
