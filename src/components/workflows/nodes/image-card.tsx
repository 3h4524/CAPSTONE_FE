"use client";

import { ImageIcon } from "lucide-react";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { VideoNodePreview } from "@/components/workflows/nodes/video-node-preview";
import { summarizeNodeConfig } from "@/helpers/workflow-config";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

export const ImageCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 2);

  return (
    <NodeShell nodeId={id} data={data} selected={selected} widthClassName="w-72">
      <div className="p-2.5 pb-2">
        {data.type === "generate-video" ? <VideoNodePreview /> : <div className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-slate-400">
          <ImageIcon className="size-7" aria-hidden="true" />
          <p className="text-[11px] font-medium">Preview appears after run</p>
        </div>}
      </div>
      <div className="px-3 pb-2.5">
        <NodeSummary lines={summary} />
      </div>
    </NodeShell>
  );
};
