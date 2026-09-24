"use client";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { readInstructionsPreview, summarizeNodeConfig } from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const PromptCard = ({ data, selected }: NodeProps<WorkflowNode>) => {
  const instructions = readInstructionsPreview(data.config);
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 2);

  return (
    <NodeShell data={data} selected={selected} widthClassName="w-60">
      {(instructions || summary.length > 0) && (
        <div className="space-y-1 border-t px-3 py-2">
          {instructions ? (
            <p className="line-clamp-3 border-l-2 border-violet-300 pl-2 text-xs text-slate-600 italic">
              {instructions}
            </p>
          ) : (
            summary.map((line) => (
              <p key={line} className="text-muted-foreground truncate text-xs">
                {line}
              </p>
            ))
          )}
        </div>
      )}
    </NodeShell>
  );
};
