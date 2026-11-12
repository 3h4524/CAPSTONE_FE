"use client";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { readString } from "@/helpers/workflow-config";
import { toProductOptions } from "@/helpers/workflow-panel";
import { showsInputProduct } from "@/helpers/workflow-run";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useBatches } from "@/hooks/queries/use-batches";
import { useNodeSettingsLocked } from "@/hooks/use-node-settings-locked";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const ProductInputCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const batchId = readString(data.config.batchId);
  const productId = readString(data.config.productId);
  const { data: batches, isPending: batchesLoading } = useBatches();
  const { data: products, isPending: productsLoading } = useBatchProducts(batchId);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  // A video workflow picks its product at Mockup Approval, so the card shows only the batch.
  const showProduct = useWorkflowStore((state) => showsInputProduct(state.nodes));
  const disabled = useNodeSettingsLocked(data.type);
  const batch = batches?.find((item) => item.id === batchId);
  const product = products?.find((item) => item.id === productId);
  const pending = products?.filter((item) => item.status === "pending").length;
  const batchOptions = (batches ?? []).map((item) => ({
    value: item.id,
    label: item.name,
    hint: `${item.productCount} ${item.productCount === 1 ? "product" : "products"}${item.defaultNiche ? ` · ${item.defaultNiche}` : ""}`,
  }));
  const productOptions = toProductOptions(products);

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-1.5 px-2.5 pb-2.5">
        <NodeField
          value={batchId}
          displayValue={batch?.name}
          options={batchOptions}
          onChange={(next) => {
            if (next === batchId) return;
            updateNodeConfig(id, { ...data.config, batchId: next, productId: "" });
          }}
          loading={batchesLoading}
          disabled={disabled}
          placeholder="Choose batch"
          ariaLabel="Batch"
        />
        {showProduct && (
          <NodeField
            value={productId}
            displayValue={product?.name}
            options={productOptions}
            onChange={(next) => updateNodeConfig(id, { ...data.config, productId: next })}
            loading={Boolean(batchId) && productsLoading}
            disabled={disabled || !batchId}
            placeholder="Choose product"
            ariaLabel="Product"
          />
        )}
        {pending !== undefined && (
          <p className="text-wf-faint px-0.5 text-[10px] leading-none">
            {pending} pending {pending === 1 ? "product" : "products"}
          </p>
        )}
      </div>
    </NodeFrame>
  );
};
