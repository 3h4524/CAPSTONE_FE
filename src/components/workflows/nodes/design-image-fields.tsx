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
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode } from "@/types/workflow";

type DesignImageFieldsProps = {
  nodeId: string;
  data: WorkflowNode["data"];
  disabled?: boolean;
};

export const DesignImageFields = ({ nodeId, data, disabled = false }: DesignImageFieldsProps) => {
  const model = readString(data.config.imageProvider);
  const ratio = readString(data.config.aspectRatio);
  const variants = readNumber(data.config.variants) ?? 2;
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const variantsField = getWorkflowNodeDefinition(data.type)?.fields.find(
    (field) => field.kind === "number" && field.name === "variants"
  );
  const maxVariants = variantsField?.kind === "number" ? variantsField.max : 4;
  const variantOptions = Array.from({ length: maxVariants }, (_, index) => ({
    value: String(index + 1),
    label: String(index + 1),
  }));
  const modelOptions = getSelectFieldOptions(data.type, "imageProvider");
  const ratioOptions = getSelectFieldOptions(data.type, "aspectRatio");

  return (
    <>
      <NodeField
        value={model}
        displayValue={getSelectFieldLabel(data.type, "imageProvider", model)}
        options={modelOptions}
        onChange={(next) => updateNodeConfig(nodeId, { ...data.config, imageProvider: next })}
        disabled={disabled}
        placeholder="Choose image model"
        ariaLabel="Image model"
      />
      <NodeSegmented
        options={variantOptions}
        value={String(variants)}
        onChange={(next) => updateNodeConfig(nodeId, { ...data.config, variants: Number(next) })}
        disabled={disabled}
        ariaLabel="Variants per product"
      />
      <NodeSegmented
        options={ratioOptions}
        value={ratio}
        onChange={(next) => updateNodeConfig(nodeId, { ...data.config, aspectRatio: next })}
        disabled={disabled}
        ariaLabel="Aspect ratio"
      />
    </>
  );
};
