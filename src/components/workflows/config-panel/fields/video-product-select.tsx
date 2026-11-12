"use client";

import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { readString } from "@/helpers/workflow-config";
import { toProductOptions } from "@/helpers/workflow-panel";
import { supportsBatchVideos } from "@/helpers/workflow-run";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useWorkflowStore } from "@/stores/workflow";

const FIELD_ID = "video-product";

// The video's product, chosen where the video part starts. It is stored in Product input's config (the run takes
// it from there when it starts), but a video workflow shows it only here.
export const VideoProductSelect = () => {
  const input = useWorkflowStore((state) => state.nodes.find((node) => node.data.type === "product-input"));
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const batchVideos = useWorkflowStore((state) => supportsBatchVideos(state.nodes));
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const batchId = readString(input?.data.config.batchId);
  const { data: products, isPending, isError, refetch } = useBatchProducts(batchId);
  if (!input) return null;

  return (
    <div className="space-y-2">
      <Label htmlFor={FIELD_ID}>Product for the video</Label>
      {batchId ? (
        <OptionSelect
          standaloneId={FIELD_ID}
          value={readString(input.data.config.productId)}
          options={toProductOptions(products)}
          placeholder="Choose one product"
          clearable
          onChange={(productId) => updateNodeConfig(input.id, { ...input.data.config, productId })}
          isLoading={isPending}
          isError={isError}
          onRetry={() => refetch()}
          disabled={isRunning}
          emptyMessage="This batch has no products yet."
        />
      ) : (
        <PanelNotice tone="warning">Choose a batch in Product input first.</PanelNotice>
      )}
      <p className="text-muted-foreground text-xs leading-relaxed">
        {isRunning
          ? "The run in progress keeps this product."
          : batchVideos
            ? "Optional. Every design you approve here gets a video; you set the scenes up on this product's mock-ups."
            : "These video settings make this product's video only."}
      </p>
    </div>
  );
};
