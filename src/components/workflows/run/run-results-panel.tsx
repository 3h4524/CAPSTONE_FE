"use client";

import { useState } from "react";

import { resetMockupOverride } from "@/api/mockup-templates";
import { GeneratedImagesGrid, type MockupPreviewTarget } from "@/components/batch-jobs/generated-images-grid";
import { JobProgressCard } from "@/components/batch-jobs/job-progress-card";
import { MockupImageEditDialog } from "@/components/batch-jobs/mockup-image-edit-dialog";
import { MockupResultsGrid } from "@/components/batch-jobs/mockup-results-grid";
import { MockupGenerateDialog } from "@/components/mockups/mockup-generate-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ApprovalReviewPanel } from "@/components/workflows/run/approval-review-panel";
import { showToast } from "@/helpers/toast";
import { readStringArray } from "@/helpers/workflow-config";
import { countApprovals, DESIGNS_READY_STATUSES } from "@/helpers/workflow-run";
import { useMutation } from "@/hooks/mutations/use-mutation";
import { applySelectionAndGenerateMockups } from "@/hooks/use-batch-run";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { GenerateAllMockupsResult, MockupImage } from "@/types/mockup-templates";
import type { WorkflowNode } from "@/types/workflow";
import { useQueryClient } from "@tanstack/react-query";

// Columns follow the panel's own width (it can be dragged wider), not the screen's: one column while
// it is narrow so each card keeps room for its button, then two and three as it grows.
const PANEL_GRID = "grid-cols-1 gap-2 @sm:grid-cols-2 @2xl:grid-cols-3";

// What the open run produced, shown beside the canvas for the Design image and Apply mock-up nodes.
export const RunResultsPanel = ({ node }: { node: WorkflowNode }) => {
  const queryClient = useQueryClient();
  const job = useWorkflowRunStore((state) => state.job);
  const mockupState = useWorkflowRunStore((state) => state.mockupState);
  const mockupResult = useWorkflowRunStore((state) => state.mockupResult);
  const [previewTarget, setPreviewTarget] = useState<MockupPreviewTarget | null>(null);
  // The mock-up being changed on its own, apart from the job's settings.
  const [editing, setEditing] = useState<MockupImage | null>(null);
  const restore = useMutation<GenerateAllMockupsResult, { jobId: string; slotKey: string }>({
    mutationFn: ({ jobId, slotKey }) => resetMockupOverride(jobId, slotKey),
    onSuccess: (result) => {
      useWorkflowRunStore.getState().setMockupResult(result);
      showToast("success", "Mock-up restored.");
    },
  });

  if (!job) {
    return <p className="text-muted-foreground p-4 text-sm">Results appear here once the run has started.</p>;
  }

  const productNameById = new Map(job.products.map((product) => [product.productId, product.productName]));
  const designsReady = DESIGNS_READY_STATUSES.includes(job.status);
  const showsMockups = node.data.type === "apply-mockup";
  const showsApproval = node.data.type === "design-approval";
  const approvedCount = countApprovals(job).approved;
  const needsApproval = job.requireApproval === true;
  const chosenTemplateCount = readStringArray(node.data.config.mockupTemplateIds).length;

  // Saves what the node currently has chosen first: the job keeps the selection it was last given,
  // so generating without saving would repeat the old templates and change nothing.
  const regenerateMockups = () => applySelectionAndGenerateMockups(job.id, queryClient);
  const editingProduct = editing ? job.products.find((product) => product.productId === editing.productId) : undefined;
  const editingDesignUrl = editingProduct?.images.find((image) => image.id === editing?.designImageId)?.imageUrl ?? null;
  const showEdited = (result: GenerateAllMockupsResult) => {
    useWorkflowRunStore.getState().setMockupResult(result);
    setEditing(null);
    showToast("success", "Mock-up updated. The job keeps this change when its mock-ups are made again.");
  };

  return (
    <ScrollArea className="h-full [&>[data-radix-scroll-area-viewport]>div]:block!">
      <div className="@container space-y-5 p-4">
        <JobProgressCard job={job} bare />
        {showsApproval ? (
          <ApprovalReviewPanel job={job} />
        ) : showsMockups ? (
          <section className="space-y-3" aria-label="Mock-ups">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Mock-ups</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!designsReady || mockupState === "running" || (needsApproval && approvedCount === 0)}
                onClick={() => void regenerateMockups()}
              >
                {mockupState === "running" ? "Generating…" : mockupResult ? "Apply & regenerate" : "Generate"}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Uses the {chosenTemplateCount} template{chosenTemplateCount === 1 ? "" : "s"} chosen in this node&apos;s Settings.
            </p>
            {mockupState === "failed" && <p role="alert" className="text-destructive text-xs">Mock-ups could not be generated. Try again.</p>}
            {!designsReady && <p className="text-muted-foreground text-xs">Mock-ups are made once the design images are ready.</p>}
            {designsReady && needsApproval && approvedCount === 0 && (
              <p className="text-muted-foreground text-xs">Approve at least one design in the Approval gate first.</p>
            )}
            {mockupResult && (
              <MockupResultsGrid
                result={mockupResult}
                productNameById={productNameById}
                columnsClassName={PANEL_GRID}
                onEdit={designsReady ? setEditing : undefined}
                onRestore={designsReady ? (slot) => restore.mutate({ jobId: job.id, slotKey: slot.slotKey }) : undefined}
                disabled={mockupState === "running" || restore.isPending}
              />
            )}
          </section>
        ) : (
          <section className="space-y-3" aria-label="Generated images">
            <h3 className="text-sm font-semibold">Generated images</h3>
            {job.products.some((product) => product.images.length > 0) ? (
              <GeneratedImagesGrid products={job.products} onPreview={setPreviewTarget} columnsClassName={PANEL_GRID} />
            ) : (
              <p className="text-muted-foreground text-xs">No images yet.</p>
            )}
          </section>
        )}
      </div>
      <MockupGenerateDialog
        open={previewTarget !== null}
        designImageId={previewTarget?.designImageId ?? null}
        designImageUrl={previewTarget?.designImageUrl ?? null}
        productName={previewTarget?.productName ?? ""}
        productType={previewTarget?.productType ?? ""}
        onOpenChange={(nextOpen) => !nextOpen && setPreviewTarget(null)}
      />
      <MockupImageEditDialog
        batchJobId={job.id}
        image={editing}
        productName={editingProduct?.productName ?? "Product"}
        productType={editingProduct?.productType ?? ""}
        designImageUrl={editingDesignUrl}
        onOpenChange={(nextOpen) => !nextOpen && setEditing(null)}
        onSaved={showEdited}
      />
    </ScrollArea>
  );
};
