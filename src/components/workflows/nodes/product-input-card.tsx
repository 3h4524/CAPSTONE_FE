"use client";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { readString } from "@/helpers/workflow-config";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const ProductInputCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const { data: products } = useBatchProducts(readString(data.config.batchId));
  const product = products?.find(p => p.id === readString(data.config.productId));
  return <NodeShell nodeId={id} data={data} selected={selected} widthClassName="w-60"><div className="space-y-2 p-3"><p className="text-xs font-medium">{product?.name ?? (data.config.productId ? "Product selected" : "Choose one product")}</p><p className="text-muted-foreground text-xs">{product ? product.productType.replaceAll("_", " ") : "One product per run"}</p></div></NodeShell>;
};
