"use client";

import { readString } from "@/helpers/workflow-config";
import { useBatches } from "@/hooks/queries/use-batches";
import { useWorkflowStore } from "@/stores/workflow";
import type { ProductLine } from "@/types/batches";

/** The product line of the batch the workflow reads from, or null before one is chosen or loaded. */
export const useWorkflowProductLine = (): ProductLine | null => {
  const batchId = useWorkflowStore((state) =>
    readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId)
  );
  const { data: batches } = useBatches();
  return batches?.find((batch) => batch.id === batchId)?.productLine ?? null;
};
