"use client";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeSegmented } from "@/components/workflows/nodes/node-segmented";
import {
  getSelectFieldLabel,
  getSelectFieldOptions,
  getWorkflowNodeDefinition,
  readNumber,
  readString,
} from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";

export const DesignImageFields = ({ data }: { data: WorkflowNode["data"] }) => {
  const model = readString(data.config.imageProvider);
  const ratio = readString(data.config.aspectRatio);
  const variants = readNumber(data.config.variants) ?? 2;
  const variantsField = getWorkflowNodeDefinition(data.type)?.fields.find(
    (field) => field.kind === "number" && field.name === "variants"
  );
  const maxVariants = variantsField?.kind === "number" ? variantsField.max : 4;
  const variantOptions = Array.from({ length: maxVariants }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));

  return (
    <>
      <NodeField
        value={getSelectFieldLabel(data.type, "imageProvider", model)}
        placeholder="Choose image model"
        chevron
      />
      <NodeSegmented options={variantOptions} value={String(variants)} ariaLabel="Variants per product" />
      <NodeSegmented
        options={getSelectFieldOptions(data.type, "aspectRatio")}
        value={ratio}
        ariaLabel="Aspect ratio"
      />
    </>
  );
};
