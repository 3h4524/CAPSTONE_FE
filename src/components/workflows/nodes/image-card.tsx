"use client";

import { Film, ImageIcon } from "lucide-react";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { summarizeNodeConfig } from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const ImageCard = ({ data, selected }: NodeProps<WorkflowNode>) => {
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 2);
  const PreviewIcon = data.type === "generate-video" ? Film : ImageIcon;

  return (
    <NodeShell data={data} selected={selected} widthClassName="w-72">
      <div className="p-2.5 pb-2">
        <div className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-lg bg-white/5 text-slate-500 ring-1 ring-white/10 ring-inset">
          <PreviewIcon className="size-7" aria-hidden="true" />
          <p className="text-[11px] font-medium">Preview appears after run</p>
        </div>
      </div>
      <div className="px-3 pb-2.5">
        <NodeSummary lines={summary} />
      </div>
    </NodeShell>
  );
};
