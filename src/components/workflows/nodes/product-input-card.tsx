"use client";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { readString, summarizeNodeConfig } from "@/helpers/workflow-config";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const ProductInputCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const { data: products } = useBatchProducts(readString(data.config.batchId));
  const product = products?.find(p => p.id === readString(data.config.productId));
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 1);
  return <NodeShell nodeId={id} data={data} selected={selected} widthClassName="w-60"><div className="space-y-2 p-3"><NodeSummary lines={summary} />{(product || readString(data.config.productId)) && <p className="text-muted-foreground text-xs">Video: {product ? `${product.name} · ${product.productType.replaceAll("_", " ")}` : "product selected"}</p>}</div></NodeShell>;
};
