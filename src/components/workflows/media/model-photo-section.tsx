"use client";

import { PackageSearch } from "lucide-react";

import { PanelEmptyState } from "@/components/workflows/config-panel/layout/panel-empty-state";
import { MockupCard } from "@/components/workflows/media/mockup-card";
import { ModelPhotoMockupForm } from "@/components/workflows/media/model-photo-mockup-form";
import { readString } from "@/helpers/workflow-config";
import { useMockupAssets } from "@/hooks/queries/use-mockup-assets";
import { useWorkflowRuntime } from "@/hooks/use-workflow-runtime";
import { useWorkflowStore } from "@/stores/workflow";

/**
 * Model photos for a workflow without a video: the form that puts the product's mock-ups on one, and the images it
 * made. A workflow with a video has the same form in its mock-up list.
 */
export const ModelPhotoSection = () => {
  const configuredProductId = useWorkflowStore((state) =>
    readString(
      state.nodes.find((node) => node.data.type === "product-input")?.data.config.productId
    )
  );
  const { run } = useWorkflowRuntime();
  const productId = run?.productId ?? configuredProductId;
  const { data: assets } = useMockupAssets(productId);

  if (!productId)
    return (
      <PanelEmptyState
        icon={PackageSearch}
        title="Select a product in Product Input first."
        description="Its mock-ups can then be put on a model photo."
      />
    );

  const made = (assets ?? []).filter(
    (asset) => asset.role === "Lifestyle" && asset.sourceType === "generated"
  );
  return (
    <div className="@container space-y-3">
      <ModelPhotoMockupForm productId={productId} assets={assets ?? []} />
      {made.length > 0 && (
        <div className="grid gap-3 @md:grid-cols-2">
          {made.map((asset) => (
            <MockupCard
              key={asset.id}
              asset={asset}
              review={false}
              selectable={false}
              selected={false}
              onSelect={() => undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
