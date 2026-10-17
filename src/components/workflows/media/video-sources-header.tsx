"use client";

import { Button } from "@/components/ui/button";
import { showToast } from "@/helpers/toast";
import { readString } from "@/helpers/workflow-config";
import { useImportGeneratedMockups } from "@/hooks/mutations/use-import-generated-mockups";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { BatchJobProductResult } from "@/types/batch-jobs";

const NO_PRODUCTS: BatchJobProductResult[] = [];

// Sits above the list of mock-ups a video can use. The mock-ups made by Apply mock-up are not in that list
// until they are stored as images, which this does for the product the video is for.
export const VideoSourcesHeader = ({ description }: { description: string }) => {
  const configuredProductId = useWorkflowStore((state) =>
    readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.productId)
  );
  const { run } = useWorkflowRuntime();
  const productId = run?.productId ?? configuredProductId;
  // The open batch job may have made its mock-ups for other products than the one the video is for.
  const otherJobProducts = useWorkflowRunStore((state) => {
    const products = state.job?.products;
    return !products || products.some((product) => product.productId === productId) ? NO_PRODUCTS : products;
  });
  const { mutate: importMockups, isPending } = useImportGeneratedMockups();

  const addGenerated = (id: string) =>
    importMockups(id, {
      onSuccess: ({ importedCount, failedCount, mockups }) => {
        if (failedCount > 0) showToast("warning", `${failedCount} mock-up${failedCount === 1 ? "" : "s"} could not be added. Try again in a moment.`);
        else if (importedCount > 0) showToast("success", `Added ${importedCount} mock-up${importedCount === 1 ? "" : "s"} for the video.`);
        else if (mockups.length === 0) showToast("info", "This product has no mock-ups yet. Make them with Apply mock-up, or upload finished photos.");
        else showToast("info", "This product's mock-ups are already in the list.");
      },
    });

  // Makes the video for a product of the open job, whose mock-ups were just made, and adds them to the list.
  // The video run is made from the saved workflow, so the change is saved before Run.
  const chooseForVideo = (id: string, name: string) => {
    const input = useWorkflowStore.getState().nodes.find((node) => node.data.type === "product-input");
    if (!input) return;
    useWorkflowStore.getState().updateNodeConfig(input.id, { ...input.data.config, productId: id });
    addGenerated(id);
    showToast("info", `The video is now for ${name}. Save, then Run to start it.`);
  };

  return (
    <div className="space-y-2 border-t pt-4">
      <div>
        <h3 className="text-sm font-semibold">Mock-ups for the video</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
      {productId && otherJobProducts.length > 0 && (
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <p>
            {`These are the mock-ups of the product chosen for the video in Product input. The open run made its mock-ups for ${otherJobProducts.map((product) => product.productName).join(", ")}${run ? ": choose that product in Product input and Run again to use them." : "."}`}
          </p>
          {/* A started video run keeps its product, so the switch is offered only before the video part starts. */}
          {!run && (
            <div className="flex flex-wrap gap-2">
              {otherJobProducts.map((product) =>
                product.productId ? (
                  <Button key={product.id} type="button" size="sm" variant="outline" disabled={isPending} onClick={() => chooseForVideo(product.productId!, product.productName)}>
                    {`Use ${product.productName} for the video`}
                  </Button>
                ) : null
              )}
            </div>
          )}
        </div>
      )}
      {productId && (
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => addGenerated(productId)}>
          {isPending ? "Adding mock-ups…" : "Add this product's mock-ups"}
        </Button>
      )}
    </div>
  );
};
