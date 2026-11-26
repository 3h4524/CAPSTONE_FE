"use client";

import { countProductTypes } from "@/helpers/mockup-template";
import { useBatchProducts } from "@/hooks/queries/use-batch-products";
import { useWorkflowStore } from "@/stores/workflow";
import { useWorkflowRunStore } from "@/stores/workflow-run";

/** The batch the workflow reads from (Product Input), or "" when none is chosen. */
export const useWorkflowBatchId = () =>
  useWorkflowStore((state) => {
    const batchId = state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId;
    return typeof batchId === "string" ? batchId : "";
  });

/**
 * How many products of each type (lower case) the next run makes mock-ups for: the batch's pending products if there
 * are any, else the ones in the run being viewed, else everything in the batch. Undefined while nothing is known.
 */
export const useRunProductTypeCounts = (): Record<string, number> | undefined => {
  const batchId = useWorkflowBatchId();
  const runJob = useWorkflowRunStore((state) => state.job);
  const { data: products } = useBatchProducts(batchId);
  const pendingProducts = products?.filter((product) => product.status === "pending") ?? [];
  return pendingProducts.length > 0
    ? countProductTypes(pendingProducts)
    : runJob?.batchId === batchId
      ? countProductTypes(runJob.products)
      : products
        ? countProductTypes(products)
        : undefined;
};
