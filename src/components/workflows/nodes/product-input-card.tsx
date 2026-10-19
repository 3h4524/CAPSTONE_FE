"use client";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { readString, summarizeNodeConfig } from "@/helpers/workflow-config";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const ProductInputCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const { data: products } = useBatchProducts(readString(data.config.batchId));
  const product = products?.find((p) => p.id === readString(data.config.productId));
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 1);

  return (
    <NodeShell nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-2.5 px-3 py-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold tracking-[0.1em] text-slate-400 uppercase">
            Batch
          </p>
          <NodeSummary lines={summary} />
        </div>
        {(product || readString(data.config.productId)) && (
          <div className="border-t border-slate-100 pt-2">
            <p className="mb-1 text-[10px] font-semibold tracking-[0.1em] text-slate-400 uppercase">
              Video product
            </p>
            <p className="truncate text-xs font-medium text-slate-700">
              {product
                ? `${product.name} · ${product.productType.replaceAll("_", " ")}`
                : "Product selected"}
            </p>
          </div>
        )}
      </div>
    </NodeShell>
  );
};
