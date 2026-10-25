"use client";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { WORKFLOW_CATEGORIES } from "@/constants/workflow";
import {
  getWorkflowNodeDefinition,
  readInstructionsPreview,
  summarizeNodeConfig,
} from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";
import { cn } from "@/utils/cn";
import type { NodeProps } from "@xyflow/react";

export const PromptCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const instructions = readInstructionsPreview(data.config);
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 2);
  const category = WORKFLOW_CATEGORIES.find(
    (item) => item.id === getWorkflowNodeDefinition(data.type)?.category
  );

  return (
    <NodeShell nodeId={id} data={data} selected={selected} widthClassName="w-60">
      <div className="space-y-3 px-3 py-3">
        <p
          className={cn(
            "line-clamp-4 text-[13px] leading-[1.55]",
            instructions ? "text-slate-700" : "text-slate-400"
          )}
        >
          {instructions || "No prompt configured yet."}
        </p>
        {summary.length > 0 && (
          <div className="space-y-1 border-l-2 border-slate-200 pl-2.5">
            <NodeSummary lines={summary} />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
        <p className="text-[11px] font-medium text-slate-500">{category?.label}</p>
        <p className="text-[11px] text-slate-400 tabular-nums">
          {instructions ? `${instructions.length} chars` : "Empty"}
        </p>
      </div>
    </NodeShell>
  );
};
