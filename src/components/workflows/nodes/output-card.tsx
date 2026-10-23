"use client";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { getWorkflowNodeDefinition, summarizeNodeConfig } from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const OutputCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 3);
  const description = getWorkflowNodeDefinition(data.type)?.description;

  return (
    <NodeShell nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="px-3 py-3">
        {summary.length > 0 ? (
          <NodeSummary lines={summary} />
        ) : (
          <p className="text-muted-foreground text-xs leading-4">{description}</p>
        )}
      </div>
    </NodeShell>
  );
};
