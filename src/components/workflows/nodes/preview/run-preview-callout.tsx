"use client";

import type { ReactNode } from "react";

import { NodeControl } from "@/components/workflows/nodes/node-control";
import { DesignPreview } from "@/components/workflows/nodes/preview/design-preview";
import { ListingPreview } from "@/components/workflows/nodes/preview/listing-preview";
import { MockupPreview } from "@/components/workflows/nodes/preview/mockup-preview";
import { PublishPreview } from "@/components/workflows/nodes/preview/publish-preview";
import { VideoPreview } from "@/components/workflows/nodes/preview/video-preview";
import { RUN_PREVIEW_GAP, RUN_PREVIEW_WIDTH } from "@/constants/workflow-run-effects";
import { previewSideOf, type RunPreviewSide } from "@/helpers/workflow-run-view";
import { useWorkflowStore } from "@/stores/workflow";
import type { WorkflowNodeData, WorkflowNodeStatus } from "@/types/workflow";
import { cn } from "@/utils/cn";

type RunPreviewCalloutProps = {
  nodeId: string;
  data: WorkflowNodeData;
  status: WorkflowNodeStatus;
  progress: number;
};

const SIDE_CLASS_NAMES: Record<RunPreviewSide, string> = {
  right: "top-0 left-full slide-in-from-left-2",
  left: "top-0 right-full slide-in-from-right-2",
  bottom: "top-full left-0 slide-in-from-top-2",
  top: "bottom-full left-0 slide-in-from-bottom-2",
};

const SIDE_MARGINS: Record<
  RunPreviewSide,
  "marginLeft" | "marginRight" | "marginTop" | "marginBottom"
> = {
  right: "marginLeft",
  left: "marginRight",
  bottom: "marginTop",
  top: "marginBottom",
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
  const side = useWorkflowStore((state) => {
    const node = state.nodes.find((candidate) => candidate.id === props.nodeId);
    return node ? previewSideOf(node, state.nodes) : "right";
  });
  const content = previewContent(props);
  if (!content) return null;

  return (
    <aside
      className={cn(
        "bg-wf-surface border-wf-line animate-in fade-in absolute z-20 overflow-hidden rounded-xl border p-2.5 shadow-xl empty:hidden",
        SIDE_CLASS_NAMES[side]
      )}
      style={{ width: RUN_PREVIEW_WIDTH, [SIDE_MARGINS[side]]: RUN_PREVIEW_GAP }}
    >
      <NodeControl className="w-full max-w-full min-w-0 overflow-hidden">{content}</NodeControl>
    </aside>
  );
};
