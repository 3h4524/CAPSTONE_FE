"use client";

import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/workflows/config-panel/fields/option-select";
import { PanelNotice } from "@/components/workflows/config-panel/layout/panel-notice";
import { readString } from "@/helpers/workflow-config";
import { toProductOptions } from "@/helpers/workflow-panel";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useWorkflowStore } from "@/stores/workflow";

const FIELD_ID = "video-product";

// The video's product, offered again where the video part starts. It is stored in Product input (the run
// takes it from there when it starts), so both places show and change the same value.
export const VideoProductSelect = () => {
  const input = useWorkflowStore((state) => state.nodes.find((node) => node.data.type === "product-input"));
  const isRunning = useWorkflowStore((state) => state.isRunning);
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
        {isRunning ? "The run in progress keeps this product." : "Shared with Product input: changing it here changes it there too."}
      </p>
    </div>
  );
};
