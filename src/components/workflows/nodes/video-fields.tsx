"use client";

import { NodeField } from "@/components/workflows/nodes/node-field";
import { NodeReadonlyText } from "@/components/workflows/nodes/node-readonly-text";
import { NodeSegmented } from "@/components/workflows/nodes/node-segmented";
import { getVideoOutputFormat, getVideoOutputFormats } from "@/helpers/video-output-formats";
import { getSelectFieldLabel, readString } from "@/helpers/workflow-config";
import type { WorkflowNode, WorkflowNodeConfig } from "@/types/workflow";

const readTransition = (config: WorkflowNodeConfig) => {
  const options = config.standardOptions;
  if (typeof options !== "object" || options === null || Array.isArray(options)) return "";
  const transition = (options as Record<string, unknown>).transition;
  return typeof transition === "string" ? transition : "";
};

export const VideoFields = ({ data }: { data: WorkflowNode["data"] }) => {
  const mode = readString(data.config.mode) || "standard";
  const format = getVideoOutputFormat(data.config.outputFormat, mode);
  const transition = readTransition(data.config);
  const textOverlay = readString(data.config.textOverlay);

  return (
    <>
      <NodeSegmented
        options={getVideoOutputFormats(mode).map((item) => ({ value: item.value, label: item.label }))}
        value={format.value}
        ariaLabel="Output format"
      />
      <NodeField
        value={getSelectFieldLabel(data.type, "standardOptions.transition", transition)}
        placeholder="Transition"
        chevron
      />
      <NodeReadonlyText value={textOverlay} placeholder="Add text overlay…" />
    </>
  );
};
