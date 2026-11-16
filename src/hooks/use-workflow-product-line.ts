"use client";

import { productLineRatios } from "@/constants/batches";
import { readString } from "@/helpers/workflow-config";
import { useBatches } from "@/hooks/queries/use-batches";
import { useWorkflowStore } from "@/stores/workflow";
import type { ProductLine } from "@/types/batches";
import type { WorkflowOption } from "@/types/workflow";

/** The product line of the batch the workflow reads from, or null before one is chosen or loaded. */
export const useWorkflowProductLine = (): ProductLine | null => {
  const batchId = useWorkflowStore((state) =>
    readString(state.nodes.find((node) => node.data.type === "product-input")?.data.config.batchId)
  );
  const { data: batches } = useBatches();
  return batches?.find((batch) => batch.id === batchId)?.productLine ?? null;
};

/** The design aspect ratios offered for a line: the ones that suit its print area, all of them without a line. */
export const ratioOptionsFor = <T extends Pick<WorkflowOption, "value">>(options: T[], line: ProductLine | null): T[] =>
  line ? options.filter((option) => productLineRatios[line].ratios.includes(option.value)) : options;
