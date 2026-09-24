"use client";

import { ImageIcon } from "lucide-react";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { summarizeNodeConfig } from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const ImageCard = ({ data, selected }: NodeProps<WorkflowNode>) => {
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 2);

  return (
    <NodeShell data={data} selected={selected} widthClassName="w-72">
      <div className="px-3 pb-2">
        <div className="flex aspect-video flex-col items-center justify-center gap-1 rounded-lg bg-slate-100 text-slate-400">
          <ImageIcon className="size-6" aria-hidden="true" />
          <p className="text-[11px] font-medium">Preview appears after run</p>
        </div>
      </div>
      {summary.length > 0 && (
        <div className="space-y-1 border-t px-3 py-2">
          {summary.map((line) => (
            <p key={line} className="text-muted-foreground truncate text-xs">
              {line}
            </p>
          ))}
        </div>
      )}
    </NodeShell>
  );
};
