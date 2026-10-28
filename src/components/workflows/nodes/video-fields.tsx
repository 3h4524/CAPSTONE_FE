"use client";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeSegmented } from "@/components/workflows/nodes/node-segmented";
import { NodeTextInput } from "@/components/workflows/nodes/node-text-input";
import { getVideoOutputFormat, getVideoOutputFormats } from "@/helpers/video-output-formats";
import { getSelectFieldLabel, getSelectFieldOptions, readString } from "@/helpers/workflow-config";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNode, WorkflowNodeConfig } from "@/types/workflow";

type VideoFieldsProps = {
  nodeId: string;
  data: WorkflowNode["data"];
  disabled?: boolean;
};

const readTransition = (config: WorkflowNodeConfig) => {
  const options = config.standardOptions;
  if (typeof options !== "object" || options === null || Array.isArray(options)) return "";
  const transition = (options as Record<string, unknown>).transition;
  return typeof transition === "string" ? transition : "";
};

export const VideoFields = ({ nodeId, data, disabled = false }: VideoFieldsProps) => {
  const mode = readString(data.config.mode) || "standard";
  const format = getVideoOutputFormat(data.config.outputFormat, mode);
  const transition = readTransition(data.config);
  const textOverlay = readString(data.config.textOverlay);
  const updateNodeConfig = useWorkflowStore((state) => state.updateNodeConfig);
  const transitionOptions = getSelectFieldOptions(data.type, "standardOptions.transition");
  const updateStandardOption = (name: string, value: string) => {
    const current = data.config.standardOptions;
    const options =
      typeof current === "object" && current !== null && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : {};
    updateNodeConfig(nodeId, { ...data.config, standardOptions: { ...options, [name]: value } });
  };

  return (
    <>
      <NodeSegmented
        options={getVideoOutputFormats(mode).map((item) => ({ value: item.value, label: item.label }))}
        value={format.value}
        onChange={(next) => updateNodeConfig(nodeId, { ...data.config, outputFormat: next })}
        disabled={disabled}
        ariaLabel="Output format"
      />
      <NodeField
        value={transition}
        displayValue={getSelectFieldLabel(data.type, "standardOptions.transition", transition)}
        options={transitionOptions}
        onChange={(next) => updateStandardOption("transition", next)}
        disabled={disabled}
        placeholder="Transition"
        ariaLabel="Transition"
      />
      <NodeTextInput
        value={textOverlay}
        onChange={(next) => updateNodeConfig(nodeId, { ...data.config, textOverlay: next })}
        maxLength={120}
        disabled={disabled}
        placeholder="Add text overlay…"
        ariaLabel="Text overlay"
        rows={1}
      />
    </>
  );
};
