"use client";

import { useState } from "react";
import { ImageIcon, Images, Shirt } from "lucide-react";

import { resetMockupOverride } from "@/api/mockup-templates";
import { GeneratedImagesGrid, type MockupPreviewTarget } from "@/components/batch-jobs/generated-images-grid";
import { JobProgressCard } from "@/components/batch-jobs/job-progress-card";
import { MockupImageEditDialog } from "@/components/batch-jobs/mockup-image-edit-dialog";
import { MockupResultsGrid } from "@/components/batch-jobs/mockup-results-grid";
import { SectionLoading } from "@/components/commons/loading/section-loading";
import { MockupGenerateDialog } from "@/components/mockups/mockup-generate-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PanelEmptyState } from "@/components/workflows/config-panel/layout/panel-empty-state";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
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
    return (
      <div className="p-5">
        <PanelEmptyState icon={Images} title="Results appear here once the run has started." description="Press Run to generate this batch, or open an earlier run in Product input." />
      </div>
    );
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
  const showEdited = (result: GenerateAllMockupsResult, changedCount: number) => {
    useWorkflowRunStore.getState().setMockupResult(result);
    setEditing(null);
    showToast(
      "success",
      changedCount > 1
        ? `${changedCount} mock-ups updated. The job keeps these changes when its mock-ups are made again.`
        : "Mock-up updated. The job keeps this change when its mock-ups are made again."
    );
  };

  return (
    <ScrollArea className="h-full [&>[data-radix-scroll-area-viewport]>div]:block!">
      <div className="@container space-y-6 p-5">
        <JobProgressCard job={job} bare />
        {showsApproval ? (
          <ApprovalReviewPanel job={job} />
        ) : showsMockups ? (
          <section className="space-y-3 border-t pt-5" aria-label="Mock-ups">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-900">Mock-ups</h3>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Uses the {chosenTemplateCount} template{chosenTemplateCount === 1 ? "" : "s"} chosen in this node&apos;s Settings.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 px-3 hover:translate-y-0"
                disabled={!designsReady || mockupState === "running" || (needsApproval && approvedCount === 0)}
                onClick={() => void regenerateMockups()}
              >
                {mockupState === "running" ? "Generating…" : mockupResult ? "Apply & regenerate" : "Generate"}
              </Button>
            </div>
            {mockupState === "failed" && <PanelNotice tone="error">Mock-ups could not be generated. Try again.</PanelNotice>}
            {!designsReady && <PanelNotice>Mock-ups are made once the design images are ready.</PanelNotice>}
            {designsReady && needsApproval && approvedCount === 0 && (
              <PanelNotice tone="warning">Approve at least one design in the Approval gate first.</PanelNotice>
            )}
            {designsReady && !mockupResult && mockupState === "running" && <SectionLoading label="Generating mock-ups" className="py-8" />}
            {designsReady && !mockupResult && (mockupState === "idle" || mockupState === "done") && !(needsApproval && approvedCount === 0) && (
              <PanelEmptyState icon={Shirt} title="No mock-ups yet" description="Generate them from the approved designs and the chosen templates." />
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
          <section className="space-y-3 border-t pt-5" aria-label="Generated images">
            <h3 className="text-sm font-semibold text-slate-900">Generated images</h3>
            {job.products.some((product) => product.images.length > 0) ? (
              <GeneratedImagesGrid products={job.products} onPreview={setPreviewTarget} columnsClassName={PANEL_GRID} />
            ) : (
              <PanelEmptyState icon={ImageIcon} title="No images yet." description="Designs show up here as each product finishes." />
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
        images={mockupResult?.images ?? []}
        productName={editingProduct?.productName ?? "Product"}
        productType={editingProduct?.productType ?? ""}
        designImageUrl={editingDesignUrl}
        onOpenChange={(nextOpen) => !nextOpen && setEditing(null)}
        onSaved={showEdited}
      />
    </ScrollArea>
  );
};
