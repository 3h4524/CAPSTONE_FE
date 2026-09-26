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
      <div className="space-y-2 p-3">
        <p className={cn("line-clamp-4 text-xs leading-relaxed", instructions ? "text-slate-700" : "text-slate-400")}>
          {instructions || "No prompt configured yet."}
        </p>
        <NodeSummary lines={summary} />
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-1.5">
        <p className="text-[11px] font-medium text-slate-400">{category?.label}</p>
        <p className="text-[11px] text-slate-400">{instructions ? `${instructions.length} chars` : "Empty"}</p>
      </div>
    </NodeShell>
  );
};
