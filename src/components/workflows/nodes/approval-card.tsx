"use client";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { readString, summarizeNodeConfig } from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const ApprovalCard = ({ data, selected }: NodeProps<WorkflowNode>) => {
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 2);
  const isAuto = readString(data.config.mode) === "auto";

  return (
    <NodeShell data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-1 border-t border-amber-100 bg-amber-50/60 px-3 py-2">
        {summary.map((line) => (
          <p key={line} className="truncate text-xs font-medium text-amber-900">
            {line}
          </p>
        ))}
        {!isAuto && <p className="text-[11px] text-amber-700">Designs pause here until approved.</p>}
      </div>
    </NodeShell>
  );
};
