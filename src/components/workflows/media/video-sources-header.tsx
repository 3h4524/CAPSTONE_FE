"use client";

import { Button } from "@/components/ui/button";
import { showToast } from "@/helpers/toast";
import { readString } from "@/helpers/workflow-config";
import { useImportGeneratedMockups } from "@/hooks/mutations/use-import-generated-mockups";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";

// Sits above the list of mock-ups a video can use. The mock-ups made by Apply mock-up are not in that list
// until they are stored as images, which this does for the product the video is for.
export const VideoSourcesHeader = ({ description }: { description: string }) => {
  const configuredProductId = useWorkflowStore((state) =>
    readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.productId)
  );
  const { run } = useWorkflowRuntime();
  const productId = run?.productId ?? configuredProductId;
  const { mutate: importMockups, isPending } = useImportGeneratedMockups();

  const addGenerated = () =>
    importMockups(productId, {
      onSuccess: ({ importedCount, failedCount }) => {
        if (failedCount > 0) showToast("warning", `${failedCount} mock-up${failedCount === 1 ? "" : "s"} could not be added. Try again in a moment.`);
        else if (importedCount > 0) showToast("success", `Added ${importedCount} mock-up${importedCount === 1 ? "" : "s"} for the video.`);
        else showToast("info", "This product's mock-ups are already in the list.");
      },
    });

  return (
    <div className="space-y-2 border-t pt-4">
      <div>
        <h3 className="text-sm font-semibold">Mock-ups for the video</h3>
        <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
      </div>
      {productId && (
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={addGenerated}>
          {isPending ? "Adding mock-ups…" : "Add this product's mock-ups"}
        </Button>
      )}
    </div>
  );
};
