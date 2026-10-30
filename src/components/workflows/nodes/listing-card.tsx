"use client";

import { NodeCheck } from "@/components/workflows/nodes/node-check";
import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { NodeSegmented } from "@/components/workflows/nodes/node-segmented";
import {
  getSelectFieldLabel,
  getSelectFieldOptions,
  readBoolean,
  readString,
} from "@/helpers/workflow-config";
import { useNodeSettingsLocked } from "@/hooks/use-node-settings-locked";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode, WorkflowNodeType } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

const LISTING_TYPE: WorkflowNodeType = "generate-listing";

export const ListingCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const model = readString(data.config.model);
  const tone = readString(data.config.tone);
  const modelLabel = getSelectFieldLabel(LISTING_TYPE, "model", model);
  const modelOptions = getSelectFieldOptions(LISTING_TYPE, "model");
  const toneOptions = getSelectFieldOptions(LISTING_TYPE, "tone");
  const seoScore = readBoolean(data.config.includeSeoScore);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const disabled = useNodeSettingsLocked(data.type);

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-1.5 px-2.5 pb-2.5">
        <NodeField
          value={model}
          displayValue={modelLabel}
          options={modelOptions}
          onChange={(next) => updateNodeConfig(id, { ...data.config, model: next })}
          disabled={disabled}
          placeholder="Choose language model"
          ariaLabel="Language model"
        />
        <NodeSegmented
          options={toneOptions}
          value={tone}
          onChange={(next) => updateNodeConfig(id, { ...data.config, tone: next })}
          disabled={disabled}
          ariaLabel="Tone"
        />
        <NodeCheck
          label="SEO score"
          checked={seoScore}
          onChange={(next) => updateNodeConfig(id, { ...data.config, includeSeoScore: next })}
          disabled={disabled}
        />
      </div>
    </NodeFrame>
  );
};
