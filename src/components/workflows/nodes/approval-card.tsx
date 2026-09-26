"use client";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { readString, summarizeNodeConfig } from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const ApprovalCard = ({ data, selected }: NodeProps<WorkflowNode>) => {
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 2);
  const isAuto = readString(data.config.mode) === "auto";

  return (
    <NodeShell data={data} selected={selected} widthClassName="w-60">
      {(summary.length > 0 || !isAuto) && (
        <div className="space-y-1 bg-amber-400/10 p-3">
          <NodeSummary lines={summary} tone="amber" />
          {!isAuto && <p className="text-[11px] text-amber-200/70">Designs pause here until approved.</p>}
        </div>
      )}
    </NodeShell>
  );
};
