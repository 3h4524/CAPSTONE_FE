"use client";

import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { readString } from "@/helpers/workflow-config";
import { toProductOptions } from "@/helpers/workflow-panel";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useWorkflowStore } from "@/stores/workflow";

const FIELD_ID = "publish-product";

// The product a workflow publishes without a video, chosen at Mockup Approval. It is stored in Product input's config
// (the run takes it from there when it starts). A video workflow has none: it makes a video for every approved design.
export const VideoProductSelect = () => {
  const input = useWorkflowStore((state) => state.nodes.find((node) => node.data.type === "product-input"));
  const isRunning = useWorkflowStore((state) => state.isRunning);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const batchId = readString(input?.data.config.batchId);
  const { data: products, isPending, isError, refetch } = useBatchProducts(batchId);
  if (!input) return null;

  return (
    <div className="space-y-2">
      <Label htmlFor={FIELD_ID}>Product to publish</Label>
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
          : "Its approved mock-ups are what gets published. One run publishes one product."}
      </p>
    </div>
  );
};
