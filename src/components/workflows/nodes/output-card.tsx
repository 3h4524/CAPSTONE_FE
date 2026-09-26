"use client";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { summarizeNodeConfig } from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const OutputCard = ({ data, selected }: NodeProps<WorkflowNode>) => {
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 3);

  return (
    <NodeShell data={data} selected={selected} widthClassName="w-60">
      {summary.length > 0 && (
        <div className="p-3">
          <NodeSummary lines={summary} />
        </div>
      )}
    </NodeShell>
  );
};
