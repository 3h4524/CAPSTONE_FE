"use client";

import Image from "next/image";

import { DesignImageFields } from "@/components/workflows/nodes/design-image-fields";
import { MockupFields } from "@/components/workflows/nodes/mockup-fields";
import { NodeFrame } from "@/components/workflows/nodes/node-frame";
import { VideoFields } from "@/components/workflows/nodes/video-fields";
import { VideoNodePreview } from "@/components/workflows/nodes/video-node-preview";
import { useWorkflowRunStore } from "@/stores/workflow-run";
import type { WorkflowNode } from "@/types/workflow";
import type { NodeProps } from "@xyflow/react";

const MAX_THUMBNAILS = 4;

export const ImageCard = ({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const job = useWorkflowRunStore((state) => state.job);
  const mockupResult = useWorkflowRunStore((state) => state.mockupResult);
  const images =
    data.type === "design-image"
      ? (job?.products.flatMap((product) => product.images.map((image) => image.imageUrl)) ?? [])
      : data.type === "apply-mockup"
        ? (mockupResult?.images.map((image) => image.mockupImageUrl) ?? [])
        : [];
  const shown = images.slice(0, MAX_THUMBNAILS);
  const progress = Math.max(0, Math.min(100, data.progress ?? 0));

  return (
    <NodeFrame nodeId={id} data={data} selected={selected} widthClassName="w-72">
      <div className="space-y-1.5 px-2.5 pb-2.5">
        {data.type === "design-image" && <DesignImageFields data={data} />}
        {data.type === "apply-mockup" && <MockupFields data={data} />}
        {data.type === "generate-video" && <VideoFields data={data} />}

        {progress > 0 && (data.type === "design-image" || data.type === "generate-video") && (
          <div className="bg-wf-line h-1 overflow-hidden rounded-full" aria-hidden="true">
            <span className="bg-wf-accent block h-full" style={{ width: `${progress}%` }} />
          </div>
        )}

        {shown.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {shown.map((url, index) => (
              <div key={`${index}:${url}`} className="relative aspect-square overflow-hidden rounded-sm">
                <Image src={url} alt="" fill sizes="64px" unoptimized className="object-cover" />
              </div>
            ))}
          </div>
        )}

        {data.type === "generate-video" && <VideoNodePreview />}
      </div>
    </NodeFrame>
  );
};
