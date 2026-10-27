"use client";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { readString } from "@/helpers/workflow-config";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useBatches } from "@/hooks/queries/use-batches";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const ProductInputCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const batchId = readString(data.config.batchId);
  const productId = readString(data.config.productId);
  const { data: batches } = useBatches();
  const { data: products } = useBatchProducts(batchId);
  const batch = batches?.find((item) => item.id === batchId);
  const product = products?.find((item) => item.id === productId);
  const pending = products?.filter((item) => item.status === "pending").length;

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="[&>div]:before:text-wf-accent space-y-1.5 px-2.5 pb-2.5 [&>div]:relative [&>div]:pl-4 [&>div]:before:absolute [&>div]:before:top-0 [&>div]:before:left-0 [&>div]:before:font-mono [&>div]:before:text-[10px] [&>div]:before:leading-8 [&>div]:before:content-['>']">
        <NodeField value={batch?.name} placeholder="Choose batch" chevron />
        <NodeField value={product?.name} placeholder="Choose video product" chevron />
        {pending !== undefined && (
          <p className="text-wf-faint px-0.5 text-[10px] leading-none">
            {pending} pending {pending === 1 ? "product" : "products"}
          </p>
        )}
      </div>
    </NodeFrame>
  );
};
