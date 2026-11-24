"use client";

import type { ReactNode } from "react";

import { NodeControl } from "@/components/workflows/nodes/node-control";
import { DesignPreview } from "@/components/workflows/nodes/preview/design-preview";
import { ListingPreview } from "@/components/workflows/nodes/preview/listing-preview";
import { MockupPreview } from "@/components/workflows/nodes/preview/mockup-preview";
import { PublishPreview } from "@/components/workflows/nodes/preview/publish-preview";
import { VideoPreview } from "@/components/workflows/nodes/preview/video-preview";
import { RUN_PREVIEW_GAP, RUN_PREVIEW_WIDTH } from "@/constants/workflow-run-effects";
import type { WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";
import { cn } from "@/utils/cn";

type RunPreviewCalloutProps = {
  nodeId: string;
  data: WorkflowNodeData;
  status: WorkflowNodeStatus;
  progress: number;
};

const previewContent = ({ nodeId, data, status, progress }: RunPreviewCalloutProps): ReactNode => {
  switch (data.type) {
    case "design-image":
      return <DesignPreview status={status} />;
    case "generate-listing":
      return <ListingPreview />;
    case "apply-mockup":
      return <MockupPreview status={status} />;
    case "generate-video":
      return <VideoPreview data={data} status={status} progress={progress} />;
    case "publish-etsy":
    case "publish-printify":
      return <PublishPreview nodeId={nodeId} data={data} status={status} progress={progress} />;
    default:
      return null;
  }
};

export const RunPreviewCallout = (props: RunPreviewCalloutProps) => {
  const content = previewContent(props);
  if (!content) return null;
  const interactive = props.data.type === "generate-video";

  return (
    <aside
      className={cn(
        "bg-wf-surface border-wf-line animate-in fade-in slide-in-from-left-2 absolute top-0 left-full z-20 rounded-xl border p-2.5 shadow-xl empty:hidden",
        !interactive && "pointer-events-none"
      )}
      style={{ width: RUN_PREVIEW_WIDTH, marginLeft: RUN_PREVIEW_GAP }}
    >
      {interactive ? <NodeControl>{content}</NodeControl> : content}
    </aside>
  );
};
