"use client";

import Image from "next/image";
import { Film, ImageIcon } from "lucide-react";

import { NodeShell } from "@/components/workflows/nodes/node-shell";
import { NodeSummary } from "@/components/workflows/nodes/node-summary";
import { summarizeNodeConfig } from "@/helpers/workflow-config";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

const MAX_THUMBNAILS = 4;

export const ImageCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const summary = summarizeNodeConfig(data.type, data.config).slice(0, 2);
  const PreviewIcon = data.type === "generate-video" ? Film : ImageIcon;
  // Select the stored objects and derive the list here: a selector that builds a new array on every
  // call never settles under zustand 5 and loops until React gives up.
  const job = useWorkflowRunStore((state) => state.job);
  const mockupResult = useWorkflowRunStore((state) => state.mockupResult);
  // The images this node produced in the open run: designs for Design image, mock-ups for Apply mock-up.
  const images =
    data.type === "design-image"
      ? (job?.products.flatMap((product) => product.images.map((image) => image.imageUrl)) ?? [])
      : data.type === "apply-mockup"
        ? (mockupResult?.images.map((image) => image.mockupImageUrl) ?? [])
        : [];
  const shown = images.slice(0, MAX_THUMBNAILS);
  const progress =
    data.type === "design-image" && job
      ? `${job.processedProducts} of ${job.totalProducts} products${job.failedProducts > 0 ? ` · ${job.failedProducts} failed` : ""}`
      : null;

  return (
    <NodeShell nodeId={id} data={data} selected={selected} widthClassName="w-72">
      <div className="p-2.5 pb-2">
        {shown.length > 0 ? (
          <div className="space-y-1.5">
            <div className="grid grid-cols-4 gap-1.5">
              {shown.map((url) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
                  <Image src={url} alt="" fill sizes="64px" unoptimized className="object-cover" />
                </div>
              ))}
            </div>
            {images.length > shown.length && <p className="text-[11px] text-slate-500">+{images.length - shown.length} more</p>}
          </div>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-slate-400">
            <PreviewIcon className="size-7" aria-hidden="true" />
            <p className="text-[11px] font-medium">Preview appears after run</p>
          </div>
        )}
      </div>
      <div className="space-y-1 px-3 pb-2.5">
        {progress && <p className="text-xs font-medium text-slate-700">{progress}</p>}
        <NodeSummary lines={summary} />
      </div>
    </NodeShell>
  );
};
